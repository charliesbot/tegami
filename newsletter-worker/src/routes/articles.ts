export async function articlesHandler(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	// Get articles with pagination
	const articles = await env.DB.prepare(
		`
        SELECT
            a.id,
            a.subject,
            a.sender,
            a.content_hash
        FROM articles a
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    `
	)
		.bind(limit, offset)
		.all();

	// Get total count for pagination
	const totalCount = await env.DB.prepare(
		`
        SELECT COUNT(*) as count
        FROM articles a
    `
	).first();

	return new Response(
		JSON.stringify({
			items: articles.results,
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

export async function articleHandler(request: Request, env: Env, id: string): Promise<Response> {
	const article = await env.DB.prepare(
		`
        SELECT
            a.id,
            a.subject,
            a.sender,
            a.r2_object_key
        FROM articles a
        WHERE a.id = ?
    `
	)
		.bind(id)
		.first();

	if (!article) {
		return new Response('Not Found', { status: 404 });
	}

	const obj = await env.ARTICLES.get(article.r2_object_key);
	if (!obj) {
		return new Response('Not Found', { status: 404 });
	}

	return new Response(obj.body, {
		headers: { 'Content-Type': 'text/html' },
	});
}
