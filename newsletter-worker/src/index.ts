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

interface Env {
	// D1 Database binding
	DB: D1Database;
	// R2 Bucket for storing raw, unprocessed emails
	RAW_MAIL_BUCKET: R2Bucket;
	// R2 Bucket for storing the processed, deduplicated HTML content
	ARTICLES: R2Bucket;

	// The base URL of your worker, used to call itself for background processing.
	// e.g., "https://tegami-worker.your-account.workers.dev"
	API_URL: string;
	// A secret string to prevent the public from calling your internal processing endpoint.
	WORKER_SECRET: string;
}

type RequestFields = { userId: string; r2Key: string };

export default (<ExportedHandler<Env>>{
	async email(message, env: Env, ctx: ExecutionContext) {
		const mailTo = message.to;
		const user = await env.DB.prepare('SELECT id FROM users WHERE alias = ?').bind(mailTo).first();
		if (!user) {
			message.setReject('Unknown address');
			return;
		}
		const key = `${Date.now()}-${crypto.randomUUID()}.eml`;
		await env.RAW_MAIL_BUCKET.put(key, message.raw);

		// 2. fire-and-forget background call  (30-second timeout; no retries)
		ctx.waitUntil(
			fetch(`${env.API_URL}/ingest`, {
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

		/* any other tiny test routes you like */
		if (url.pathname === '/random') return new Response(crypto.randomUUID());
		return new Response('Not Found', { status: 404 });
	},
}) satisfies ExportedHandler<Env>;
