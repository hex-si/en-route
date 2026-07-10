# EN-ROUTE External Integration Platform — API Roadmap

> **Version:** 1.0.0 — Last updated: 2026-07-11
> **Status:** Living document — updated as the platform evolves

---

## Table of Contents

1. [Vision and Goals](#1-vision-and-goals)
2. [Architecture Overview](#2-architecture-overview)
3. [API Versioning Strategy](#3-api-versioning-strategy)
4. [Authentication Strategy](#4-authentication-strategy)
5. [Authorization Model](#5-authorization-model)
6. [Endpoint Categories](#6-endpoint-categories)
7. [Data Exposure Policy](#7-data-exposure-policy)
8. [Security Architecture](#8-security-architecture)
9. [Logging and Monitoring](#9-logging-and-monitoring)
10. [API Documentation Strategy](#10-api-documentation-strategy)
11. [Webhook Architecture](#11-webhook-architecture)
12. [SDK Roadmap](#12-sdk-roadmap)
13. [Developer Portal Vision](#13-developer-portal-portal-vision)
14. [Performance and Scalability](#14-performance-and-scalability-considerations)
15. [Error Response Standards](#15-error-response-standards)
16. [API Response Format Standards](#16-api-response-format-standards)
17. [Privacy and Data Protection Principles](#17-privacy-and-data-protection-principles)
18. [Deployment Strategy](#18-deployment-strategy)
19. [Testing Strategy](#19-testing-strategy)
20. [Implementation Roadmap](#20-implementation-roadmap)
21. [Risks and Mitigation Strategies](#21-risks-and-mitigation-strategies)
22. [Future Enhancements](#22-future-enhancements)
23. [Success Metrics and KPIs](#23-success-metrics-and-kpis)

---

## 1. Vision and Goals

### Vision

EN-ROUTE will evolve from a community registration platform into an **open integration ecosystem**. External partners — delivery services, logistics providers, government agencies, utility companies, healthcare organizations, and analytics platforms — will be able to securely access user and household data through a well-documented, versioned REST API.

### Core Goals

| Goal | Description |
|------|-------------|
| **Secure Data Sharing** | Provide controlled, auditable access to user data without exposing the underlying database |
| **Partner Enablement** | Allow delivery riders, logistics apps, and government systems to look up households by registration ID, phone, or zone |
| **Extensibility** | Design the API surface to grow with new entity types (orders, deliveries, services) without breaking existing integrations |
| **Privacy by Design** | Apply the principle of least privilege — each partner type sees only the data necessary for its function |
| **Developer Experience** | Offer clear documentation, consistent response formats, and SDKs that minimize integration friction |

### Non-Goals

- Replacing the existing internal admin API
- Exposing write/mutation operations to external parties in Phase 1
- Building a public marketplace (though the architecture should support it in the future)

---

## 2. Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                    External Partners                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Delivery │  │ Logistics│  │ Government│  │ Health │  │
│  │  Apps    │  │ Providers│  │  Agencies │  │Partners│  │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └───┬────┘  │
│       │              │             │              │       │
└───────┼──────────────┼─────────────┼──────────────┼───────┘
        │              │             │              │
        ▼              ▼             ▼              ▼
┌─────────────────────────────────────────────────────────┐
│              EN-ROUTE External API Gateway               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Next.js Middleware Layer                 │   │
│  │  • API Key Validation (X-API-Key header)         │   │
│  │  • Rate Limiting (per-key, in-memory)            │   │
│  │  • Request Logging                               │   │
│  │  • CORS Configuration                            │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                   │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │          Route Handlers (/api/v1/external/)      │   │
│  │  • Health Check                                  │   │
│  │  • User Lookups                                  │   │
│  │  • Household Lookups                             │   │
│  │  • Zone Browsing                                 │   │
│  │  • Statistics                                    │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                   │
│  ┌──────────────────▼───────────────────────────────┐   │
│  │          Service Layer (lib/)                     │   │
│  │  • external-auth.ts (key verification)           │   │
│  │  • external-rate-limit.ts (per-key throttling)   │   │
│  │  • external-logger.ts (audit trail)              │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                 │
│                                                         │
│  Tables:                                                │
│  ┌────────────┐  ┌───────────────────┐  ┌───────────┐  │
│  │   users    │  │ household_members │  │   zones   │  │
│  └────────────┘  └───────────────────┘  └───────────┘  │
│  ┌────────────┐  ┌───────────────────┐  ┌───────────┐  │
│  │   areas    │  │    api_keys       │  │audit_logs │  │
│  └────────────┘  └───────────────────┘  └───────────┘  │
│                                                         │
│  Service-role client (lib/supabase/admin.ts)            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Deployment Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Compute** | Cloudflare Workers (via OpenNext) | Edge-first, low latency |
| **Framework** | Next.js 15 (App Router) | Route handlers for API |
| **Database** | Supabase (PostgreSQL) | RLS enabled, service-role access |
| **Domain** | discoverukhrul.site | Production domain |
| **Build** | Wrangler + OpenNext | `npm run deploy` |

### Existing Internal API Routes (not exposed externally)

```
/api/admin/*          — Admin operations (x-admin-key auth)
/api/users/*          — User CRUD
/api/zones/*          — Zone listing
/api/stats/*          — Platform statistics
/api/member/search/*  — Member search
/api/lookup/phone/*   — Phone-based lookup
/api/register/*       — User registration
/api/updates/*        — Announcement management
/api/ads/*            — Ad management
```

The external API will be a **separate namespace** (`/api/v1/external/`) that shares the same database layer but with distinct auth, rate limiting, and data shaping logic.

---

## 3. API Versioning Strategy

### URL-Based Versioning

All external API endpoints will be prefixed with a version segment:

```
/api/v1/external/...
/api/v2/external/...
/api/v3/external/...
```

### Version Lifecycle

| Stage | Duration | Description |
|-------|----------|-------------|
| **Current** | Active | Latest version, fully supported |
| **Supported** | 12 months after next version | Receives bug fixes and security patches |
| **Deprecated** | 6 months after sunset | Returns `Sunset` header, logs warnings |
| **Retired** | — | Returns `410 Gone` |

### Version Increment Rules

- **Major version bump** (`v1` → `v2`): Breaking changes to response shapes, removed fields, changed authentication
- **Minor version bump** (`v1.1` → `v1.2`): New optional fields, new endpoints, backward-compatible
- **Patch** (`v1.0.1` → `v1.0.2`): Bug fixes, documentation updates — no version change needed

### Version Negotiation

Partners specify the version in the URL path. If omitted, the API defaults to the latest stable version. A `Deprecation` header is returned for deprecated versions.

```
GET /api/v1/external/lookup/registration/P-E001
GET /api/v2/external/lookup/registration/P-E001
```

---

## 4. Authentication Strategy

### Phase 1: API Keys `[Planned]`

External partners authenticate using a unique API key passed in the `X-API-Key` request header.

```
GET /api/v1/external/lookup/registration/P-E001
X-API-Key: envrk_a1b2c3d4e5f6g7h8i9j0...
```

**Key Properties:**

| Property | Value |
|----------|-------|
| Format | `envrk_` prefix + 40 random alphanumeric characters |
| Storage | SHA-256 hash only (plaintext shown once at creation) |
| Validation | Hash incoming key → lookup in `api_keys` table → check `is_active` |
| Rate Limit | Configurable per key (default: 100 requests/hour) |
| Rotation | Manual via admin panel; no automatic expiration in Phase 1 |

**Key Lifecycle:**

```
Admin generates key
       │
       ▼
Key shown once (envrk_xxxxx...)
       │
       ▼
Hash stored in api_keys table
       │
       ▼
Partner uses key in X-API-Key header
       │
       ▼
Middleware hashes → verifies → allows/denies
       │
       ▼
Admin can revoke (toggle is_active = false)
```

### Phase 2: OAuth 2.0 `[Future]`

For partners requiring more granular authorization and automated token management.

| Flow | Use Case |
|------|----------|
| **Client Credentials** | Server-to-server integrations (delivery platforms) |
| **Authorization Code** | User-facing apps that need delegated access |

**Token Properties:**

| Property | Value |
|----------|-------|
| Format | JWT with RS256 signing |
| Lifetime | 1 hour (access), 30 days (refresh) |
| Scopes | `users:read`, `households:read`, `zones:read`, `stats:read` |
| Rotation | Automatic via refresh tokens |

### Phase 3: Multi-Factor + IP Binding `[Future]`

For high-security partners (government, healthcare):

- OAuth 2.0 + mutual TLS (mTLS) for client authentication
- IP allowlisting per partner
- Request signing (HMAC-SHA256) for tamper detection

---

## 5. Authorization Model

### Partner Roles

Each API key is assigned a **role** that determines what data it can access.

| Role | Description | Endpoint Access |
|------|-------------|-----------------|
| `delivery_readonly` | Delivery rider apps — location + contact only | Lookup by registration ID, phone; zone browsing |
| `household_read` | Logistics providers — full household data | All delivery_readonly + household members, verification status |
| `analytics_read` | Analytics platforms — aggregated data | Statistics, zone summaries, user counts |
| `government_read` | Government agencies — full profiles | All household_read + full user details, area data |
| `admin` | Internal systems — unrestricted access | All endpoints |

### Permission Matrix

| Endpoint | `delivery_readonly` | `household_read` | `analytics_read` | `government_read` |
|----------|:---:|:---:|:---:|:---:|
| `GET /health` | ✅ | ✅ | ✅ | ✅ |
| `GET /lookup/registration/:id` | ✅ | ✅ | ❌ | ✅ |
| `GET /lookup/phone/:phone` | ✅ | ✅ | ❌ | ✅ |
| `GET /zones` | ✅ | ✅ | ✅ | ✅ |
| `GET /zones/:id/households` | ✅ | ✅ | ✅ | ✅ |
| `GET /user/:id` | ✅ | ✅ | ❌ | ✅ |
| `GET /stats` | ❌ | ❌ | ✅ | ✅ |
| `GET /areas` | ❌ | ❌ | ✅ | ✅ |

### Scope-Based Fine-Grained Control `[Future]`

When OAuth 2.0 is introduced, roles are replaced with scopes:

```
scopes: ["users:read:basic", "users:read:full", "households:read", "zones:read", "stats:read"]
```

Each endpoint maps to required scopes. A token with insufficient scopes receives `403 Forbidden`.

---

## 6. Endpoint Categories

### 6.1 Health

Status: `[Planned]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/health` | API health check, returns `{ status: "ok" }` |

**Use case:** Partners verify connectivity before making lookup requests.

### 6.2 Users

Status: `[Planned]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/user/:id` | Get user by UUID — full profile + household members |
| `GET` | `/api/v1/external/lookup/phone/:phone` | Look up user by phone number |

**Response fields:**

```json
{
  "id": "uuid",
  "full_name": "Jonathan Shimray",
  "phone": "9876543210",
  "maps_link": "https://maps.google.com/...",
  "location_desc": "Near Phungreitang church",
  "house_type": "own",
  "verification_status": "verified",
  "household_registration_id": "P-E001",
  "zone": "Phungreitang – East",
  "household_members": [
    { "name": "Family Member", "phone": "1234567890" }
  ]
}
```

### 6.3 Households

Status: `[Planned]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/lookup/registration/:regId` | Look up household by registration ID (e.g. `P-E001`) |
| `GET` | `/api/v1/external/user/:id/members` | Get household members for a user |

**Registration ID format:** `{zone_prefix}{number}` — e.g., `P-E001`, `W-W042`

### 6.4 Zones

Status: `[Planned]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/zones` | List all zones with household counts |
| `GET` | `/api/v1/external/zones/:zoneId/households` | List all households in a zone (paginated) |

**Zone response:**

```json
{
  "zones": [
    {
      "id": "uuid",
      "name": "Phungreitang – East",
      "prefix": "P-E",
      "household_count": 142
    }
  ]
}
```

### 6.5 Orders `[Future]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/external/orders` | Create a delivery order linked to a household |
| `GET` | `/api/v1/external/orders/:orderId` | Get order status |
| `PATCH` | `/api/v1/external/orders/:orderId` | Update delivery status |
| `GET` | `/api/v1/external/user/:id/orders` | List orders for a user |

**Requires:** `orders` table migration, partner role `orders_manage`.

### 6.6 Delivery `[Future]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/delivery/route/:zoneId` | Optimized delivery route for a zone |
| `POST` | `/api/v1/external/delivery/confirm` | Confirm delivery completion |
| `GET` | `/api/v1/external/delivery/history` | Delivery history (paginated) |

### 6.7 Statistics

Status: `[Planned]`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/external/stats/summary` | Platform stats: user count, zone breakdown, household count |
| `GET` | `/api/v1/external/stats/zones` | Per-zone statistics |

**Stats response:**

```json
{
  "total_users": 1247,
  "total_households": 890,
  "verified_users": 1100,
  "zones": [
    {
      "name": "Phungreitang – East",
      "prefix": "P-E",
      "household_count": 142,
      "member_count": 520
    }
  ],
  "generated_at": "2026-07-11T00:00:00Z"
}
```

---

## 7. Data Exposure Policy

### Principle of Least Privilege

Each partner type receives only the data required for its function.

| Partner Type | Data Visible | Data Hidden |
|-------------|-------------|-------------|
| **Delivery Rider** | Full name, phone, maps_link, location_desc, zone, registration_id | Points, referral_code, verification_status |
| **Logistics Provider** | All delivery data + household_members, house_type, verification_status | Points, referral_code |
| **Analytics Platform** | Aggregated statistics, zone counts, user counts | Individual PII |
| **Government Agency** | Full user profile, all household data, area info | Internal points, referral chain |
| **Internal Admin** | Everything | Nothing |

### Field-Level Exposure Map

| Field | Delivery | Logistics | Analytics | Government | Admin |
|-------|:---:|:---:|:---:|:---:|:---:|
| `id` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `full_name` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `phone` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `maps_link` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `location_desc` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `house_type` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `verification_status` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `points` | ❌ | ❌ | ✅ | ❌ | ✅ |
| `referral_code` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `referred_by` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `zone_id` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `household_registration_id` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `head_user_id` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `household_members.*` | ❌ | ✅ | ❌ | ✅ | ✅ |

### Data Shaping Implementation

The API layer will select fields based on the authenticated partner's role before returning responses. Raw database rows are never returned directly.

---

## 8. Security Architecture

### 8.1 HTTPS Only `[Planned]`

- All API endpoints enforce HTTPS via Cloudflare edge rules
- HTTP requests receive `301 Moved Permanently` to HTTPS
- HSTS header with 1-year max-age

### 8.2 SHA-256 API Key Storage `[Planned]`

Following the existing pattern in `lib/auth.ts`:

```
Partner receives key:    envrk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Stored hash (DB):        e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

- Keys are generated with 256 bits of entropy
- Only the SHA-256 hash is stored in the database
- Plaintext is shown once at creation; never stored or recoverable
- Incoming keys are hashed and compared against stored hashes

### 8.3 Rate Limiting `[Planned]`

Per-key rate limiting using an in-memory store (extensible to Redis):

| Tier | Rate Limit | Burst |
|------|-----------|-------|
| Default | 100 requests/hour | 20 requests/minute |
| Premium | 1000 requests/hour | 100 requests/minute |
| Government | 5000 requests/hour | 200 requests/minute |

**Rate limit headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1689072000
Retry-After: 3600  (only on 429)
```

### 8.4 Audit Logging `[Planned]`

Every external API request is logged:

| Field | Description |
|-------|-------------|
| `timestamp` | Request time (ISO 8601) |
| `api_key_id` | Which key was used |
| `partner_name` | Human-readable partner name |
| `method` | HTTP method |
| `path` | Request path |
| `query_params` | Query parameters (redacted if sensitive) |
| `status_code` | HTTP response code |
| `response_time_ms` | Time to respond |
| `ip_address` | Client IP |
| `user_agent` | Client user agent |

**Storage:** `api_audit_logs` table in Supabase, with 90-day retention.

### 8.5 IP Allowlisting `[Future]`

Partners can optionally restrict their API keys to specific IP addresses or CIDR ranges:

```
api_keys.ip_allowlist = ['203.0.113.0/24', '198.51.100.42']
```

Requests from non-allowed IPs receive `403 Forbidden`.

### 8.6 Key Rotation `[Future]`

- Admin can trigger rotation → old key invalidated, new key generated
- 7-day grace period where both old and new keys work
- Partner notified via email webhook
- Automatic rotation option: key expires after N days, partner must rotate

### 8.7 Key Expiration `[Future]`

| Key Type | Default Expiry | Max Expiry |
|----------|---------------|------------|
| Standard | 90 days | 365 days |
| Premium | 180 days | 730 days |
| Government | 365 days | No limit |

Expired keys receive `401 Unauthorized` with `error: "key_expired"`.

---

## 9. Logging and Monitoring

### Structured Logging

All API events use structured JSON logging compatible with Cloudflare Workers Analytics:

```json
{
  "level": "info",
  "event": "api_request",
  "timestamp": "2026-07-11T02:30:00Z",
  "api_key_id": "uuid",
  "partner": "FoodPanda Riders",
  "method": "GET",
  "path": "/api/v1/external/lookup/registration/P-E001",
  "status": 200,
  "response_time_ms": 45,
  "ip": "203.0.113.42"
}
```

### Alerting Rules `[Planned]`

| Condition | Action |
|-----------|--------|
| > 100 failed auth attempts in 5 min | Alert: possible key brute force |
| > 500 requests/min from single key | Alert: possible abuse |
| > 5xx error rate > 5% in 10 min | Alert: service degradation |
| Response time p99 > 2000ms | Alert: performance degradation |

### Supabase Dashboard Integration

- Monitor query performance via Supabase Dashboard → SQL Editor
- Use `get_logs` and `get_advisors` MCP tools for real-time debugging
- Track `api_keys` table usage for partner activity

---

## 10. API Documentation Strategy

### OpenAPI 3.1 Specification `[Planned]`

The API will be fully documented using an OpenAPI 3.1 spec (`docs/openapi.yaml`):

- Machine-readable endpoint definitions
- Request/response schemas
- Authentication requirements
- Error codes

### Interactive Documentation `[Planned]`

Serve an interactive Swagger UI or Scalar API Reference at:

```
GET /api/v1/external/docs
```

Partners can test requests directly from the documentation page.

### Postman Collection `[Planned]`

Export a Postman collection for partners who prefer that workflow:

```
docs/postman/EN-ROUTE-External-API.postman_collection.json
```

### Changelog `[Planned]`

Maintain a `docs/API_CHANGELOG.md` file tracking:

- New endpoints
- Deprecated endpoints
- Breaking changes
- Security patches

---

## 11. Webhook Architecture

Status: `[Future]`

Allow partners to subscribe to events for real-time notifications.

### Event Types

| Event | Trigger |
|-------|---------|
| `user.registered` | New user completes registration |
| `user.verified` | Admin verifies a user |
| `household.member_added` | New member added to household |
| `order.created` | New delivery order created |
| `order.delivered` | Delivery confirmed |
| `zone.household_count_changed` | Household count in a zone changes |

### Webhook Payload

```json
{
  "event": "user.registered",
  "timestamp": "2026-07-11T02:30:00Z",
  "data": {
    "user_id": "uuid",
    "full_name": "Jonathan Shimray",
    "zone": "Phungreitang – East",
    "household_registration_id": "P-E001"
  }
}
```

### Delivery Guarantees

- At-least-once delivery
- Partner must acknowledge with `200 OK` within 10 seconds
- Retry with exponential backoff (3 attempts over 1 hour)
- Failed deliveries logged, partner can query `/webhooks/deliveries` for debugging

### Webhook Security `[Planned]`

- Signed payloads: `X-Webhook-Signature` header with HMAC-SHA256
- Partner verifies signature using their webhook secret
- Replay protection: each delivery includes unique `delivery_id`

---

## 12. SDK Roadmap

### JavaScript/TypeScript SDK `[Planned]`

First-class SDK for the EN-ROUTE ecosystem:

```typescript
import { EnRouteClient } from '@en-route/sdk';

const client = new EnRouteClient({ apiKey: 'envrk_...' });

// Lookup by registration ID
const household = await client.lookup.registration('P-E001');

// Lookup by phone
const user = await client.lookup.phone('9876543210');

// Get zone households
const households = await client.zones.getHouseholds('zone-uuid');

// Health check
const health = await client.health.check();
```

### Python SDK `[Future]`

```python
from enroute import EnRouteClient

client = EnRouteClient(api_key="envrk_...")
household = client.lookup.registration("P-E001")
```

### SDK Distribution

- **JavaScript/TypeScript**: npm package `@en-route/sdk`
- **Python**: PyPI package `enroute-sdk`
- **Go**: `go get github.com/en-route/sdk-go` `[Optional]`

### SDK Features

- Automatic retry with exponential backoff
- Built-in rate limit handling
- TypeScript type definitions
- Request/response logging
- Configurable base URL (for testing)

---

## 13. Developer Portal Vision

Status: `[Future]`

A self-service portal where partners manage their integration.

### Features

| Feature | Description |
|---------|-------------|
| **Key Management** | Generate, rotate, revoke API keys |
| **Usage Dashboard** | Real-time request counts, error rates, response times |
| **Documentation** | Interactive API docs, code samples, tutorials |
| **Test Console** | Sandbox environment for testing integrations |
| **Webhook Configuration** | Subscribe to events, view delivery logs |
| **Billing** | Usage-based billing for premium tiers (future) |
| **Support** | Ticket system, FAQ, community forum |

### Tech Stack `[Future]`

- Next.js dashboard app
- Supabase Auth for partner login
- Real-time usage streaming via WebSockets
- Stripe integration for billing

---

## 14. Performance and Scalability Considerations

### Response Time Targets

| Endpoint | Target (p50) | Target (p99) |
|----------|-------------|-------------|
| Health check | < 10ms | < 50ms |
| Lookup (single) | < 50ms | < 200ms |
| Zone listing | < 30ms | < 100ms |
| Zone households (paginated) | < 100ms | < 500ms |
| Statistics | < 200ms | < 1000ms |

### Pagination

All list endpoints support cursor-based pagination:

```
GET /api/v1/external/zones/P-E001/households?limit=20&cursor=abc123
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "xyz789",
    "has_more": true
  }
}
```

### Caching Strategy `[Planned]`

| Data | Cache TTL | Method |
|------|----------|--------|
| Zone list | 5 minutes | `Cache-Control` header |
| Zone household count | 1 minute | `Cache-Control` header |
| User profile | 0 (no cache) | Always fresh |
| Statistics | 10 minutes | `Cache-Control` header |

Cloudflare edge caching via `Cache-Control` headers for static-ish data.

### Database Optimization

- **Indexes:** Already exists on `users.phone`, `users.zone_id`, `users.household_registration_id`, `household_members.user_id`
- **Connection pooling:** Supabase handles via PgBouncer
- **Query optimization:** Select only needed columns; avoid `SELECT *`
- **N+1 prevention:** Batch queries for household members (fetch all members for multiple users in one query)

### Horizontal Scaling

Cloudflare Workers auto-scale to handle traffic spikes. No manual scaling needed. Supabase can be upgraded to higher tiers for increased connection limits.

---

## 15. Error Response Standards

### Error Envelope

All errors follow a consistent structure:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found with the provided registration ID",
    "details": null,
    "timestamp": "2026-07-11T02:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| `400` | `BAD_REQUEST` | Malformed request, missing required parameters |
| `401` | `UNAUTHORIZED` | Invalid or missing API key |
| `401` | `KEY_EXPIRED` | API key has expired |
| `403` | `FORBIDDEN` | Valid key but insufficient permissions for this endpoint |
| `404` | `NOT_FOUND` | Resource not found |
| `409` | `CONFLICT` | Resource already exists (e.g., duplicate registration) |
| `422` | `UNPROCESSABLE` | Request body is valid JSON but semantically incorrect |
| `429` | `RATE_LIMITED` | Too many requests — retry after `Retry-After` header |
| `500` | `INTERNAL_ERROR` | Unexpected server error |
| `503` | `SERVICE_UNAVAILABLE` | Temporary maintenance or overload |

### Validation Errors

For `400` and `422` responses, include field-level details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "phone", "message": "Must be a valid phone number" },
      { "field": "zone_id", "message": "Required field is missing" }
    ]
  }
}
```

---

## 16. API Response Format Standards

### Success Envelope

All successful responses are wrapped in an envelope:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-07-11T02:30:00Z",
    "version": "v1",
    "request_id": "req_abc123"
  }
}
```

### List Responses

```json
{
  "data": [...],
  "meta": {
    "timestamp": "2026-07-11T02:30:00Z",
    "version": "v1",
    "request_id": "req_abc123"
  },
  "pagination": {
    "total": 1247,
    "limit": 20,
    "offset": 0,
    "next_cursor": "abc123",
    "has_more": true
  }
}
```

### Naming Conventions

- **snake_case** for all field names (e.g., `full_name`, `household_registration_id`)
- **ISO 8601** for timestamps (e.g., `2026-07-11T02:30:00Z`)
- **UUIDs** for all resource identifiers
- **Null** for missing optional fields (never omit the key)

### Content Type

```
Content-Type: application/json; charset=utf-8
```

---

## 17. Privacy and Data Protection Principles

### Core Principles

| Principle | Implementation |
|-----------|---------------|
| **Data Minimization** | Only expose fields necessary for the partner's function |
| **Purpose Limitation** | Partner must declare use case; API keys are scoped to that use case |
| **Consent** | Users opt-in to external API visibility during registration (default: enabled for delivery use) |
| **Right to Erasure** | When a user is deleted, their data is removed from all API responses |
| **Breach Notification** | Partners must report any data breach within 24 hours |
| **Data Retention** | Audit logs retained for 90 days; partner data retention per agreement |

### PII Handling

- Phone numbers are transmitted in full (required for delivery contact)
- Full names are transmitted in full (required for identification)
- Maps links are transmitted in full (required for navigation)
- Location descriptions are transmitted in full (required for delivery instructions)
- Internal data (points, referral chains, verification notes) is never exposed to external partners

### GDPR Compliance `[Future]`

- Data Processing Agreement (DPA) template for partners
- Right to access: partners can request data export
- Right to rectification: partners can flag incorrect data
- Data portability: export in machine-readable format
- Privacy impact assessment for new endpoint categories

### Partner Agreements `[Planned]`

Before receiving API access, partners must sign:

1. **Data Processing Agreement (DPA)** — defines data handling responsibilities
2. **Acceptable Use Policy (AUP)** — prohibits misuse, resale, or unauthorized access
3. **Incident Response Plan** — defines breach notification procedures

---

## 18. Deployment Strategy

### Development Workflow

```
1. Create feature branch from main
2. Implement API endpoint + tests locally
3. Run migrations against Supabase dev branch
4. Test with local Supabase (supabase start)
5. Run lint + typecheck
6. Create PR → review → merge to main
7. Main branch auto-deploys to Cloudflare Workers
```

### Migration Strategy

Following existing pattern in `sql/migrations/`:

- New tables created via numbered migration files (e.g., `014_external_api_keys.sql`)
- Applied using `supabase_apply_migration` MCP tool
- Branch-based development: `supabase_create_branch` → `supabase_merge_branch`

### Staging Environment `[Planned]`

| Environment | Purpose | URL |
|------------|---------|-----|
| **Local** | Development & testing | `localhost:3000` |
| **Staging** | Pre-production validation | `staging.discoverukhrul.site` |
| **Production** | Live partner access | `discoverukhrul.site` |

### Rollback Strategy

1. **Code rollback:** Revert Cloudflare Workers deployment to previous version
2. **Database rollback:** Down migration (planned for all migrations)
3. **API key revocation:** Immediately revoke compromised keys via admin panel

### Feature Flags `[Future]`

Use environment variables to gate new API features:

```
EXTERNAL_API_V2_ENABLED=false
EXTERNAL_API_OAUTH_ENABLED=false
EXTERNAL_API_WEBHOOKS_ENABLED=false
```

---

## 19. Testing Strategy

### Unit Tests `[Planned]`

| Component | Framework | Coverage Target |
|-----------|----------|-----------------|
| API key hashing | Vitest | 100% |
| Rate limiting logic | Vitest | 100% |
| Data shaping (field selection) | Vitest | 100% |
| Error response formatting | Vitest | 100% |

### Integration Tests `[Planned]`

| Scenario | Approach |
|----------|----------|
| End-to-end lookup by registration ID | Supabase test database + HTTP client |
| Authentication failure | Invalid key, expired key, missing key |
| Rate limiting | Send burst requests, verify 429 |
| Pagination | Verify cursor-based pagination correctness |
| Cross-partner isolation | Verify Partner A cannot use Partner B's key |

### Load Tests `[Future]`

| Metric | Target |
|--------|--------|
| Concurrent users | 100 |
| Requests per second | 500 |
| Error rate under load | < 1% |
| p99 latency under load | < 500ms |

Tools: k6, Artillery, or Cloudflare Load Testing.

### Security Tests `[Future]`

- SQL injection attempts on lookup parameters
- API key enumeration (verify no timing side-channel)
- Rate limit bypass attempts
- CORS misconfiguration checks
- SSRF via `maps_link` validation

### Test Data Management

- Seed script populates Supabase with test users, zones, household members
- Test API keys with known permissions
- Automated test runs via CI/CD pipeline

---

## 20. Implementation Roadmap

### Phase 1: Foundation `[Planned]`

**Timeline:** 2-3 weeks
**Goal:** Launch read-only delivery API with API key auth

| Task | Status |
|------|--------|
| Create `api_keys` table migration | `[Planned]` |
| Implement `lib/external-auth.ts` (key generation, hashing, verification) | `[Planned]` |
| Implement `lib/external-rate-limit.ts` (per-key rate limiting) | `[Planned]` |
| Add `/api/v1/external/*` to middleware matcher + auth | `[Planned]` |
| Create `GET /api/v1/external/health` | `[Planned]` |
| Create `GET /api/v1/external/lookup/registration/:regId` | `[Planned]` |
| Create `GET /api/v1/external/lookup/phone/:phone` | `[Planned]` |
| Create `GET /api/v1/external/zones` | `[Planned]` |
| Create `GET /api/v1/external/zones/:zoneId/households` | `[Planned]` |
| Create `GET /api/v1/external/user/:id` | `[Planned]` |
| Create `GET /api/v1/external/stats/summary` | `[Planned]` |
| Create admin API key management page `/admin/api-keys` | `[Planned]` |
| Write OpenAPI 3.1 specification | `[Planned]` |
| Create `docs/API_CHANGELOG.md` | `[Planned]` |
| Unit tests for auth + rate limiting | `[Planned]` |
| Integration tests for all endpoints | `[Planned]` |

**Deliverables:**
- Working API with 7 endpoints
- API key management UI
- Partner onboarding guide
- OpenAPI documentation

---

### Phase 2: Enhancement `[Future]`

**Timeline:** 4-6 weeks after Phase 1
**Goal:** OAuth 2.0, webhooks, SDK, advanced features

| Task | Status |
|------|--------|
| OAuth 2.0 client credentials flow | `[Future]` |
| Scope-based authorization | `[Future]` |
| Audit logging table + middleware | `[Future]` |
| Webhook infrastructure (event bus, delivery tracking) | `[Future]` |
| JavaScript/TypeScript SDK (`@en-route/sdk`) | `[Future]` |
| Interactive Swagger UI documentation | `[Future]` |
| Partner usage dashboard | `[Future]` |
| API key rotation with grace period | `[Future]` |
| Key expiration support | `[Future]` |
| IP allowlisting | `[Future]` |
| Rate limit tiers (standard, premium, government) | `[Future]` |
| Cache-Control headers for zone data | `[Future]` |
| Load testing suite | `[Future]` |
| Security audit | `[Future]` |

**Deliverables:**
- OAuth 2.0 authentication
- JavaScript SDK published to npm
- Webhook system
- Security audit report

---

### Phase 3: Ecosystem `[Future]`

**Timeline:** 3-6 months after Phase 2
**Goal:** Full integration ecosystem with orders, delivery tracking, developer portal

| Task | Status |
|------|--------|
| Orders API (CRUD for delivery orders) | `[Future]` |
| Delivery tracking API | `[Future]` |
| Python SDK (`enroute-sdk`) | `[Future]` |
| Developer portal (self-service key provisioning) | `[Future]` |
| GraphQL API layer | `[Optional]` |
| Mutual TLS (mTLS) for high-security partners | `[Future]` |
| Request signing (HMAC-SHA256) | `[Future]` |
| Usage-based billing integration | `[Future]` |
| Partner SLA monitoring | `[Future]` |
| Real-time WebSocket events | `[Optional]` |
| Mobile SDK (React Native) | `[Optional]` |
| Marketplace for partner services | `[Optional]` |

**Deliverables:**
- Full orders + delivery API
- Developer portal
- Multi-language SDKs
- Enterprise-grade security features

---

### Milestone Summary

```
Phase 1 ────────────────────────────────────────────────►
│  Weeks 1-3                                             │
│  • API key auth                                         │
│  • 7 read-only endpoints                               │
│  • Admin key management                                 │
│  • OpenAPI docs                                         │
│                                                         │
Phase 2 ────────────────────────────────────────────────►
│  Weeks 4-10 (after Phase 1)                            │
│  • OAuth 2.0                                            │
│  • Webhooks                                             │
│  • JS/TS SDK                                            │
│  • Developer dashboard                                  │
│                                                         │
Phase 3 ────────────────────────────────────────────────►
│  Months 4-10 (after Phase 2)                           │
│  • Orders & delivery tracking                           │
│  • Developer portal                                     │
│  • Python SDK                                           │
│  • Enterprise features                                  │
│                                                         │
```

---

## 21. Risks and Mitigation Strategies

### Data Leaks

| Risk | Mitigation |
|------|-----------|
| API key compromised | SHA-256 storage; admin can revoke instantly; rate limiting limits damage window |
| Partner exceeds authorized data access | Role-based field filtering; audit logs detect anomalies |
| Partner resells user data | Acceptable Use Policy; contractual penalties; API usage monitoring |

### Service Abuse

| Risk | Mitigation |
|------|-----------|
| Brute-force key guessing | Rate limiting; key format (`envrk_` + 40 chars = 256 bits entropy) |
| DDoS via partner keys | Per-key rate limits; Cloudflare DDoS protection |
| Enumeration attacks | No differentiated error messages for "key not found" vs "key inactive" |

### Technical Failures

| Risk | Mitigation |
|------|-----------|
| Database connection exhaustion | Supabase connection pooling; query optimization |
| Cloudflare Workers cold start | Keep-alive pings; edge caching for static data |
| Supabase outage | Graceful degradation; cached responses where possible |

### Compliance

| Risk | Mitigation |
|------|-----------|
| GDPR violation | Data minimization; partner DPAs; right to erasure flow |
| Data breach | Incident response plan; 24-hour notification SLA |
| Unauthorized access | API key auth; audit logging; anomaly detection |

### Operational

| Risk | Mitigation |
|------|-----------|
| Migration breaks existing API | Separate external namespace; backward-compatible migrations |
| Partner integration breaks on update | Versioning policy; deprecation warnings; 12-month support window |
| Key management complexity | Admin UI; SDK handles auth automatically |

---

## 22. Future Enhancements

### Near-Term `[Future]`

- **API Key Scopes:** Fine-grained permissions beyond roles (e.g., `users:read:basic`, `users:read:full`)
- **Request Signing:** HMAC-SHA256 request signing for tamper detection
- **GraphQL API:** Flexible querying for partners with complex data needs
- **Batch Operations:** Single request to look up multiple users/households
- **Geospatial Queries:** Find households within a radius of a point

### Medium-Term `[Future]`

- **Real-Time Events:** WebSocket connections for live delivery tracking
- **Partner Analytics:** Self-service usage analytics dashboard
- **Marketplace:** Partner directory where delivery services list themselves
- **Mobile SDK:** React Native SDK for mobile delivery apps
- **Multi-Language Support:** i18n for API error messages

### Long-Term `[Optional]`

- **API Gateway:** Dedicated API gateway (Kong, Tyk) for advanced rate limiting, transformation, and analytics
- **gRPC Interface:** High-performance binary protocol for internal/partner systems
- **Event Sourcing:** Event-driven architecture for audit trail and replay
- **AI-Powered Routing:** Delivery route optimization using household location data
- **Federated Identity:** Partners can use their own auth systems via OIDC federation

---

## 23. Success Metrics and KPIs

### Phase 1 KPIs `[Planned]`

| Metric | Target | Measurement |
|--------|--------|-------------|
| API uptime | 99.9% | Cloudflare Analytics |
| Response time (p95) | < 200ms | Application logs |
| Error rate | < 1% | Application logs |
| Partner onboarding time | < 1 hour | Manual tracking |
| API key generation to first request | < 5 minutes | Audit logs |

### Phase 2 KPIs `[Future]`

| Metric | Target | Measurement |
|--------|--------|-------------|
| OAuth token issuance latency | < 100ms | Application logs |
| Webhook delivery rate | > 99% | Delivery logs |
| SDK adoption | 5+ partners | Package downloads |
| Documentation satisfaction | > 4/5 | Partner survey |

### Phase 3 KPIs `[Future]`

| Metric | Target | Measurement |
|--------|--------|-------------|
| Active API partners | > 20 | `api_keys` table |
| Monthly API requests | > 100,000 | Audit logs |
| Orders via API | > 1,000/month | Orders table |
| Developer portal signups | > 50 | Portal analytics |
| Partner NPS | > 70 | Quarterly survey |

### Business Metrics `[Future]`

| Metric | Target | Measurement |
|--------|--------|-------------|
| Delivery partner revenue | Track | Billing system |
| Partner retention rate | > 90% | Partner database |
| Support ticket volume | < 5/month | Support system |
| Security incidents | 0 | Incident reports |

---

## Appendix

### A. Current Database Schema Reference

**Users table:**
```
id | full_name | phone | maps_link | location_desc | photos |
house_type | points | referral_code | referred_by |
verification_status | head_user_id | zone_id |
household_registration_id | created_at | updated_at
```

**Household Members table:**
```
id | user_id | name | phone | promoted_user_id | created_at
```

**Zones table:**
```
id | name | prefix | next_number | created_at
```

**Areas table:**
```
id | name | description | is_active | created_at
```

### B. Environment Variables Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin client |
| `EXTERNAL_API_ENABLED` | Feature flag for external API |

### C. Related Files

| File | Purpose |
|------|---------|
| `lib/supabase/admin.ts` | Service-role Supabase client |
| `lib/auth.ts` | SHA-256 password hashing |
| `lib/rateLimit.ts` | In-memory rate limiting |
| `lib/privacy.ts` | Name masking utilities |
| `middleware.ts` | Route protection |
| `sql/migrations/*.sql` | Database schema migrations |

---

*This document is a living blueprint. Update it as the platform evolves, new partners join, and requirements change.*
