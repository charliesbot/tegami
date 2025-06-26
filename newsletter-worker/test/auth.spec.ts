import { describe, it, expect, vi } from 'vitest';
import { verifyAccessToken, authenticateRequest, withAuth } from '../src/helpers/auth';

// Mock environment
const mockEnv = {
	CF_ACCESS_PUBLIC_KEY: 'mock-public-key',
	CF_ACCESS_ISSUER: 'https://test.cloudflareaccess.com',
	CF_ACCESS_AUDIENCE: 'test-audience',
} as any;

describe('Authentication', () => {
	it('should reject requests without Authorization header', async () => {
		const request = new Request('https://example.com/api/user', {
			headers: {},
		});

		const result = await authenticateRequest(request, mockEnv);
		expect(result.success).toBe(false);
		expect(result.error).toBe('Missing Authorization header');
	});

	it('should reject requests with invalid Authorization format', async () => {
		const request = new Request('https://example.com/api/user', {
			headers: {
				Authorization: 'InvalidFormat token123',
			},
		});

		const result = await authenticateRequest(request, mockEnv);
		expect(result.success).toBe(false);
		expect(result.error).toBe('Invalid Authorization header format');
	});

	it('should reject requests with invalid Bearer token', async () => {
		const request = new Request('https://example.com/api/user', {
			headers: {
				Authorization: 'Bearer invalid-token',
			},
		});

		const result = await authenticateRequest(request, mockEnv);
		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('should create protected handler that returns 401 for unauthenticated requests', async () => {
		const mockHandler = vi.fn();
		const protectedHandler = withAuth(mockHandler);

		const request = new Request('https://example.com/api/user', {
			headers: {},
		});

		const response = await protectedHandler(request, mockEnv, {} as any);
		expect(response.status).toBe(401);

		const responseBody = (await response.json()) as { error: string };
		expect(responseBody.error).toBe('Missing Authorization header');
	});
});
