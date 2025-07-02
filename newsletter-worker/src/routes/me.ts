
import { AuthenticatedUser } from '../helpers/auth';

export async function meHandler(request: Request, env: Env, ctx: ExecutionContext, user: AuthenticatedUser): Promise<Response> {
  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
}
