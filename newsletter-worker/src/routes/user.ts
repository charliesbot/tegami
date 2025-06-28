import { withAuth, AuthenticatedUser } from '../helpers/auth';

export async function userHandler(request: Request, env: Env, ctx: ExecutionContext, user: AuthenticatedUser): Promise<Response> {
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
}