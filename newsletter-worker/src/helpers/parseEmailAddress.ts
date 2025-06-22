export function parseEmailAddress(email: string): { base: string; tag?: string } {
	const [localPart, _] = email.split('@');
	const [base, tag] = localPart.split('+');
	return { base, tag };
}
