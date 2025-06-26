# Tegami Architecture

## Overview

Tegami is a newsletter management system with a clean separation of concerns across three main components:

1. **Newsletter Worker** - Email processing and storage
2. **API Worker** - Public API for web and mobile clients
3. **Web Application** - React frontend

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Email Server  │───▶│ Newsletter Worker│───▶│  Cloudflare R2  │
│   (External)    │    │  (Email Processing)│   │   (Storage)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   D1 Database    │
                       │   (Metadata)     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   API Worker     │
                       │   (Public API)   │
                       └──────────────────┘
                                │
                                ▼
                ┌─────────────────────────────────┐
                │         Web App                 │
                │    (React Frontend)             │
                └─────────────────────────────────┘
                                │
                                ▼
                ┌─────────────────────────────────┐
                │         Mobile App              │
                │    (React Native/Flutter)       │
                └─────────────────────────────────┘
```

## Component Responsibilities

### Newsletter Worker (`newsletter-worker/`)

**Purpose**: Process incoming emails and store them in the system

**Key Features**:

- Email ingestion via Cloudflare Email Workers
- Content deduplication using SHA256 hashing
- Storage in Cloudflare R2 for content and D1 for metadata
- Internal `/ingest` endpoint for processing
- User authentication via Cloudflare Access

**Endpoints**:

- `POST /ingest` - Internal endpoint for email processing
- `GET /user` - Protected user information
- `GET /inbox` - Protected inbox access

### API Worker (`api-worker/`)

**Purpose**: Provide a public API for web and mobile clients

**Key Features**:

- CORS support for cross-origin requests
- Authentication via Cloudflare Access JWT
- Clean REST API design
- Error handling and validation
- Health monitoring

**Endpoints**:

- `GET /api/health` - Health check (no auth required)
- `GET /api/user` - User information (authenticated)
- `GET /api/inbox` - User's newsletter inbox (authenticated)
- `GET /api/articles/:id` - Newsletter content (authenticated)

### Web Application (`web/`)

**Purpose**: React frontend for users to access their newsletters

**Key Features**:

- TanStack Router for routing
- TanStack Start for full-stack capabilities
- Tailwind CSS for styling
- TypeScript for type safety
- API service layer for backend communication

**Routes**:

- `/` - Home page with navigation
- `/newsletters` - Newsletter list
- `/newsletters/:id` - Newsletter content
- `/users` - User management (example)

## Data Flow

### Email Processing Flow

1. Email arrives at Newsletter Worker
2. Worker extracts user from email address
3. Raw email stored in R2
4. Background process parses email content
5. Content deduplicated and stored
6. Inbox entry created in D1 database

### API Access Flow

1. User authenticates via Cloudflare Access
2. JWT token provided to client
3. Client includes token in API requests
4. API Worker validates token
5. User data retrieved from database
6. Response returned with CORS headers

## Security

### Authentication

- Cloudflare Access JWT tokens
- Token validation on all protected endpoints
- User access control for newsletter content

### Data Protection

- Content deduplication prevents storage waste
- User isolation in database queries
- CORS configured for web/mobile access

## Development Setup

### Newsletter Worker

```bash
cd newsletter-worker
npm install
npm run dev
```

### API Worker

```bash
cd api-worker
npm install
npm run dev
```

### Web Application

```bash
cd web
npm install
npm run dev
```

## Environment Variables

### Newsletter Worker

- `CF_ACCESS_PUBLIC_KEY` - JWT verification key
- `CF_ACCESS_ISSUER` - Token issuer
- `CF_ACCESS_AUDIENCE` - Token audience
- `WORKER_SECRET` - Internal API secret

### API Worker

- `CF_ACCESS_PUBLIC_KEY` - JWT verification key
- `CF_ACCESS_ISSUER` - Token issuer
- `CF_ACCESS_AUDIENCE` - Token audience

## Database Schema

### users

- `id` (UUID) - Primary key
- `alias` (TEXT) - Email alias
- `created_at` (DATETIME) - Account creation

### articles

- `id` (UUID) - Primary key
- `content_hash` (TEXT) - SHA256 hash
- `r2_object_key` (TEXT) - R2 storage key
- `subject` (TEXT) - Email subject
- `sender` (TEXT) - Sender email

### inbox

- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `article_id` (UUID) - Foreign key to articles
- `received_at` (DATETIME) - Receipt timestamp

## Benefits of This Architecture

1. **Separation of Concerns**: Each component has a clear, focused responsibility
2. **Scalability**: Components can scale independently
3. **Security**: Authentication and authorization properly separated
4. **Maintainability**: Clean code organization and clear interfaces
5. **Flexibility**: Easy to add new clients (mobile apps, etc.)
6. **Performance**: Optimized for each use case

## Next Steps

1. Implement proper authentication flow in web app
2. Add mobile app support
3. Implement newsletter management features
4. Add analytics and monitoring
5. Set up production deployment
