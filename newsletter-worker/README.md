# Newsletter Worker

A Cloudflare Worker that processes email newsletters and provides protected API endpoints for user management and inbox access.

## Features

- Email processing and storage
- Cloudflare Access authentication
- Protected API endpoints for user data and inbox
- R2 storage for email content
- D1 database for metadata

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Cloudflare Access Configuration

To enable authentication, you need to set up Cloudflare Access and configure the following environment variables:

#### Set up Cloudflare Access

1. Go to your Cloudflare dashboard
2. Navigate to Access > Applications
3. Create a new application for your API
4. Configure the application settings:
   - **Application type**: Self-hosted
   - **Session duration**: Choose appropriate duration
   - **Application domain**: Your API domain
   - **Policy**: Configure who can access the application

#### Configure Environment Variables

Set the following secrets using Wrangler:

```bash
# Set the public key for JWT verification
wrangler secret put CF_ACCESS_PUBLIC_KEY

# Set the issuer (your Cloudflare Access team domain)
wrangler secret put CF_ACCESS_ISSUER

# Set the audience (your application's audience)
wrangler secret put CF_ACCESS_AUDIENCE
```

The values should be:

- `CF_ACCESS_PUBLIC_KEY`: Your Cloudflare Access public key (found in Access > Service Auth)
- `CF_ACCESS_ISSUER`: Your team domain (e.g., `https://your-team.cloudflareaccess.com`)
- `CF_ACCESS_AUDIENCE`: Your application's audience identifier

### 3. Development

```bash
# Start development server
npm run dev

# Deploy to production
npm run deploy
```

## API Endpoints

### Protected Endpoints (Require Authentication)

All protected endpoints require a valid Cloudflare Access JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

#### GET /user

Returns the authenticated user's information.

**Response:**

```json
{
	"id": "user-uuid",
	"alias": "user-alias",
	"email": "user@example.com",
	"name": "User Name",
	"groups": ["group1", "group2"],
	"created_at": "2024-01-01T00:00:00Z"
}
```

#### GET /inbox

Returns the authenticated user's inbox items with pagination.

**Query Parameters:**

- `limit` (optional): Number of items per page (default: 50)
- `offset` (optional): Number of items to skip (default: 0)

**Response:**

```json
{
	"items": [
		{
			"id": "inbox-uuid",
			"received_at": "2024-01-01T00:00:00Z",
			"article_id": "article-uuid",
			"subject": "Newsletter Subject",
			"sender": "sender@example.com",
			"content_hash": "sha256-hash"
		}
	],
	"pagination": {
		"limit": 50,
		"offset": 0,
		"total": 100
	}
}
```

### Internal Endpoints

#### POST /ingest

Internal endpoint for processing incoming emails (requires `X-Worker-Secret` header).

#### GET /random

Returns a random UUID (for testing purposes).

## Authentication Flow

1. Users authenticate through Cloudflare Access
2. Cloudflare Access provides a JWT token
3. The JWT token is included in API requests as a Bearer token
4. The worker verifies the JWT token using the configured public key
5. If valid, the request is processed; otherwise, a 401 error is returned

## Error Responses

All endpoints return JSON error responses with appropriate HTTP status codes:

```json
{
	"error": "Error message description"
}
```

Common status codes:

- `401 Unauthorized`: Invalid or missing authentication token
- `404 Not Found`: Resource not found
- `403 Forbidden`: Access denied (for internal endpoints)

## Database Schema

The worker expects the following database tables:

### users

- `id` (UUID): Primary key
- `alias` (TEXT): User's email alias
- `created_at` (DATETIME): Account creation timestamp

### articles

- `id` (UUID): Primary key
- `content_hash` (TEXT): SHA256 hash of article content
- `r2_object_key` (TEXT): R2 storage key for article content
- `subject` (TEXT): Email subject
- `sender` (TEXT): Sender email address

### inbox

- `id` (UUID): Primary key
- `user_id` (UUID): Foreign key to users table
- `article_id` (UUID): Foreign key to articles table
- `received_at` (DATETIME): When the email was received
