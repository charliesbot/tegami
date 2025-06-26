/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import PostalMime from 'postal-mime';
import { sha256 } from './helpers/sha256';
import { parseEmailAddress } from './helpers/parseEmailAddress';
import { withAuth, AuthenticatedUser } from './helpers/auth';

type RequestFields = { userId: string; r2Key: string };

export default (<ExportedHandler<Env>>{
	async email(message, env: Env, ctx: ExecutionContext) {
		const { base } = parseEmailAddress(message.to);
		const user = await env.DB.prepare('SELECT id FROM users WHERE alias = ?').bind(base).first();
		if (!user) {
			message.setReject('Unknown address');
			return;
		}
		const key = `${Date.now()}-${crypto.randomUUID()}.eml`;
		await env.RAW_MAIL_BUCKET.put(key, message.raw);

		// 2. fire-and-forget background call  (30-second timeout; no retries)
		const ingestUrl = new URL('/ingest', 'http://localhost:8787');
		ctx.waitUntil(
			fetch(ingestUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Worker-Secret': env.WORKER_SECRET,
				},
				body: JSON.stringify({ userId: user.id, r2Key: key }),
			})
		);
	},

	async fetch(request: Request<RequestFields>, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/ingest' && request.method === 'POST') {
			if (request.headers.get('X-Worker-Secret') !== env.WORKER_SECRET) return new Response('forbidden', { status: 403 });

			const { userId, r2Key } = await request.json<RequestFields>();

			// pull raw .eml
			const obj = await env.RAW_MAIL_BUCKET.get(r2Key);
			if (!obj) return new Response('Not found', { status: 404 });

			const email = await new PostalMime().parse(await obj.arrayBuffer());
			const html = email.html ?? email.text ?? '';
			const hash = await sha256(html);

			let art = await env.DB.prepare('SELECT id FROM articles WHERE content_hash = ?').bind(hash).first();

			if (!art) {
				// store cleaned HTML (or the raw .eml again) in ARTICLES bucket
				await env.ARTICLES.put(`${hash}.html`, html);

				art = await env.DB.prepare(
					`
			  INSERT INTO articles (id, content_hash, r2_object_key, subject, sender)
			  VALUES (?, ?, ?, ?, ?) RETURNING id
			`
				)
					.bind(crypto.randomUUID(), hash, `${hash}.html`, email.subject ?? null, email.from?.address ?? null)
					.first();
			}

			await env.DB.prepare(
				`
			INSERT INTO inbox (id, user_id, article_id, received_at)
			VALUES (?, ?, ?, datetime('now'))
		  `
			)
				.bind(crypto.randomUUID(), userId, art?.id)
				.run();

			return new Response('ok');
		}

		// Protected endpoints that require authentication
		if (url.pathname === '/user' && request.method === 'GET') {
			return withAuth(async (request: Request, env: Env, ctx: ExecutionContext, user: AuthenticatedUser) => {
				// Get user details from database
				const dbUser = await env.DB.prepare(
					`
					SELECT id, alias, created_at 
					FROM users 
					WHERE id = ?
				`
				)
					.bind(user.id)
					.first();

				if (!dbUser) {
					return new Response(JSON.stringify({ error: 'User not found in database' }), {
						status: 404,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				return new Response(
					JSON.stringify({
						id: dbUser.id,
						alias: dbUser.alias,
						email: user.email,
						name: user.name,
						groups: user.groups,
						created_at: dbUser.created_at,
					}),
					{
						headers: { 'Content-Type': 'application/json' },
					}
				);
			})(request, env, ctx);
		}

		if (url.pathname === '/inbox' && request.method === 'GET') {
			return withAuth(async (request: Request, env: Env, ctx: ExecutionContext, user: AuthenticatedUser) => {
				const url = new URL(request.url);
				const limit = parseInt(url.searchParams.get('limit') || '50');
				const offset = parseInt(url.searchParams.get('offset') || '0');

				// Get user's inbox items with pagination
				const inboxItems = await env.DB.prepare(
					`
					SELECT 
						i.id,
						i.received_at,
						a.id as article_id,
						a.subject,
						a.sender,
						a.content_hash
					FROM inbox i
					JOIN articles a ON i.article_id = a.id
					WHERE i.user_id = ?
					ORDER BY i.received_at DESC
					LIMIT ? OFFSET ?
				`
				)
					.bind(user.id, limit, offset)
					.all();

				// Get total count for pagination
				const totalCount = await env.DB.prepare(
					`
					SELECT COUNT(*) as count
					FROM inbox i
					WHERE i.user_id = ?
				`
				)
					.bind(user.id)
					.first();

				return new Response(
					JSON.stringify({
						items: inboxItems.results,
						pagination: {
							limit,
							offset,
							total: totalCount?.count || 0,
						},
					}),
					{
						headers: { 'Content-Type': 'application/json' },
					}
				);
			})(request, env, ctx);
		}

		if (url.pathname === '/random') {
			return new Response(crypto.randomUUID());
		}

		return new Response('Not Found', { status: 404 });
	},
}) satisfies ExportedHandler<Env>;
