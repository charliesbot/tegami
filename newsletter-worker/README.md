# Newsletter Worker

This directory contains the Cloudflare Worker that serves as the backend for the Tegami project. It has two primary responsibilities:

1.  **Email Ingestion:** It acts as a target for Cloudflare Email Routing, receiving emails sent to a specific address, processing them, and storing them as articles.
2.  **API Server:** It exposes a JSON API for the web, iOS, and Android clients to consume.

## Architecture

The worker is built using a modern, modular approach suitable for Cloudflare Workers.

*   **Multi-Handler Entrypoint:** The main entry point (`src/index.ts`) uses a multi-handler approach. It contains an `email` handler for processing incoming emails and a `fetch` handler for serving API requests. This allows a single worker to handle multiple types of events.
*   **Router-based API:** The `fetch` handler acts as a simple router, delegating incoming API requests to the appropriate handler function based on the request's URL and method.
*   **Modular Routes:** All API logic is organized into separate files within the `src/routes/` directory. This keeps the codebase clean, maintainable, and easy to extend. For example, all logic related to articles is contained in `src/routes/articles.ts`.

This architecture allows for a clean separation of concerns while keeping all backend logic within a single, scalable Cloudflare Worker.

## API Endpoints

The worker exposes the following API endpoints. The API is designed with a clear distinction between public content and private, user-specific data.

### Public Endpoints

These endpoints are public and do not require authentication. They are intended to provide public content that can be displayed to all users, helping to attract new subscribers.

*   `GET /api/articles`: Returns a paginated list of all articles.
    *   Query Parameters: `limit` (default: 50), `offset` (default: 0)
*   `GET /api/articles/:id`: Returns the full HTML content of a single article.

### Private Endpoints

These endpoints require authentication and will only return data for the currently logged-in user. The `withAuth` helper middleware handles the authentication flow, ensuring user data remains secure.

*   `GET /api/user`: Returns the profile information for the authenticated user.
*   `GET /api/inbox`: Returns a paginated list of articles in the authenticated user's inbox.
    *   Query Parameters: `limit` (default: 50), `offset` (default: 0)

### Internal Endpoints

*   `POST /api/ingest`: This is an internal endpoint used by the `email` handler to process and store new articles. It is secured with a worker secret.