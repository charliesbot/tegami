import { ingestHandler } from './routes/ingest';
import { parseEmailAddress } from './helpers/parseEmailAddress';
import { withAuth } from './helpers/auth';
import { userHandler } from './routes/user';
import { inboxHandler } from './routes/inbox';
import { articlesHandler, articleHandler } from './routes/articles';

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

		if (url.pathname === '/api/ingest' && request.method === 'POST') {
			return ingestHandler(request, env);
		}

		if (url.pathname === '/api/user' && request.method === 'GET') {
			return withAuth(userHandler)(request, env, ctx);
		}

		if (url.pathname === '/api/inbox' && request.method === 'GET') {
			return withAuth(inboxHandler)(request, env, ctx);
		}

		if (url.pathname === '/api/articles' && request.method === 'GET') {
			return articlesHandler(request, env);
		}

		const articleMatch = url.pathname.match(/^\/api\/articles\/([a-zA-Z0-9-]+)$/);
		if (articleMatch && request.method === 'GET') {
			const id = articleMatch[1];
			return articleHandler(request, env, id);
		}

		return new Response('Not Found', { status: 404 });
	},
}) satisfies ExportedHandler<Env>;