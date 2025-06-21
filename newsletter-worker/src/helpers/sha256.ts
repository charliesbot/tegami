/** SHA-256 hash of a UTF-8 string, returned as lowercase hex. */
export async function sha256(input: string): Promise<string> {
	// Crypto API expects Uint8Array
	const data = new TextEncoder().encode(input);
	// Workers runtime (and all modern browsers) expose crypto.subtle.digest
	const hashBuf = await crypto.subtle.digest('SHA-256', data);
	// Convert ArrayBuffer → hex string
	return Array.from(new Uint8Array(hashBuf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
