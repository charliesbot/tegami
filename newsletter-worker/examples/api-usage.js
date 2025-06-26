// Example usage of the protected API endpoints
// This demonstrates how to authenticate and make requests to the newsletter worker API

const API_BASE_URL = 'https://your-worker.your-subdomain.workers.dev';

// Example JWT token from Cloudflare Access (you would get this after authenticating)
const JWT_TOKEN = 'your-jwt-token-here';

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(endpoint, options = {}) {
	const url = `${API_BASE_URL}${endpoint}`;
	const response = await fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${JWT_TOKEN}`,
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(`API Error: ${error.error || response.statusText}`);
	}

	return response.json();
}

// Example: Get user information
async function getUserInfo() {
	try {
		const user = await makeAuthenticatedRequest('/user');
		console.log('User Info:', user);
		return user;
	} catch (error) {
		console.error('Failed to get user info:', error.message);
	}
}

// Example: Get inbox items with pagination
async function getInboxItems(limit = 10, offset = 0) {
	try {
		const inbox = await makeAuthenticatedRequest(`/inbox?limit=${limit}&offset=${offset}`);
		console.log('Inbox Items:', inbox);
		return inbox;
	} catch (error) {
		console.error('Failed to get inbox items:', error.message);
	}
}

// Example: Get all inbox items (with pagination)
async function getAllInboxItems() {
	let allItems = [];
	let offset = 0;
	const limit = 50;

	while (true) {
		const result = await getInboxItems(limit, offset);
		if (!result || !result.items || result.items.length === 0) {
			break;
		}

		allItems = allItems.concat(result.items);
		offset += limit;

		// Stop if we've reached the end
		if (result.items.length < limit) {
			break;
		}
	}

	console.log(`Total inbox items: ${allItems.length}`);
	return allItems;
}

// Example usage
async function main() {
	console.log('=== Newsletter Worker API Examples ===\n');

	// Get user information
	console.log('1. Getting user information...');
	await getUserInfo();

	console.log('\n2. Getting first 10 inbox items...');
	await getInboxItems(10, 0);

	console.log('\n3. Getting all inbox items...');
	await getAllInboxItems();
}

// Run examples if this file is executed directly
if (typeof window === 'undefined') {
	main().catch(console.error);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		makeAuthenticatedRequest,
		getUserInfo,
		getInboxItems,
		getAllInboxItems,
	};
}
