import { AuthenticatedUser } from '../helpers/auth';

export async function inboxHandler(request: Request, env: Env, ctx: ExecutionContext, user: AuthenticatedUser): Promise<Response> {
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
}
