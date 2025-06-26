import { importX509, JWK, jwtVerify, KeyObject } from 'jose';

export interface AuthenticatedUser {
	id: string;
	email: string;
	name?: string;
	groups?: string[];
}

export interface AuthResult {
	success: boolean;
	user?: AuthenticatedUser;
	error?: string;
}

// Define a cache variable in the module scope.
// It will hold the parsed key object after the first run.
let publicKey: CryptoKey | KeyObject | JWK | Uint8Array | undefined;
/**
 * Verify Cloudflare Access JWT token and extract user information
 */
export async function verifyAccessToken(token: string, env: Env): Promise<AuthResult> {
	try {
		if (!publicKey) {
			publicKey = await importX509(env.CF_ACCESS_PUBLIC_KEY, 'RS256');
		}
		// Cloudflare Access uses RS256 algorithm
		const { payload } = await jwtVerify(token, publicKey, {
			algorithms: ['RS256'],
			issuer: env.CF_ACCESS_ISSUER,
			audience: env.CF_ACCESS_AUDIENCE,
		});

		// Extract user information from the JWT payload
		const user: AuthenticatedUser = {
			id: payload.sub as string,
			email: payload.email as string,
			name: payload.name as string,
			groups: payload.groups as string[],
		};

		return { success: true, user };
	} catch (error) {
		console.error('Token verification failed:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Invalid token',
		};
	}
}

/**
 * Extract and verify the Authorization header
 */
export async function authenticateRequest(request: Request, env: Env): Promise<AuthResult> {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader) {
		return { success: false, error: 'Missing Authorization header' };
	}

	if (!authHeader.startsWith('Bearer ')) {
		return { success: false, error: 'Invalid Authorization header format' };
	}

	const token = authHeader.substring(7); // Remove 'Bearer ' prefix
	return await verifyAccessToken(token, env);
}

/**
 * Create a protected endpoint handler that requires authentication
 */
export function withAuth(handler: (request: Request, env: Env, ctx: ExecutionContext, user: AuthenticatedUser) => Promise<Response>) {
	return async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> => {
		const authResult = await authenticateRequest(request, env);

		if (!authResult.success) {
			return new Response(JSON.stringify({ error: authResult.error || 'Authentication failed' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return handler(request, env, ctx, authResult.user!);
	};
}
