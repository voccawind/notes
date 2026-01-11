# ORBIT Notes API Documentation

Base URL: `http://localhost:4000` (development)

All API requests must include the `Authorization` header (except auth endpoints):

```
Authorization: Bearer <jwt-token>
```

## Authentication

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response**:
```json
{
  "userId": "uuid",
  "token": "jwt-token",
  "refreshToken": "refresh-token"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response**: Same as register

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

**Response**:
```json
{
  "token": "new-jwt-token"
}
```

## Sync

### List Blobs

Get all sync blobs for an orbit.

```http
GET /sync/:orbitId/list
Authorization: Bearer <token>
```

**Response**:
```json
[
  {
    "blobId": "uuid",
    "timestamp": 1234567890,
    "size": 1024
  }
]
```

### Download Blob

```http
GET /sync/:orbitId/blob/:blobId
Authorization: Bearer <token>
```

**Response**: Binary data (Yjs update)

### Upload Blob

```http
POST /sync/:orbitId/blob
Authorization: Bearer <token>
Content-Type: application/octet-stream

<binary-data>
```

**Response**:
```json
{
  "blobId": "uuid",
  "timestamp": 1234567890
}
```

### Delete Blob

```http
DELETE /sync/:orbitId/blob/:blobId
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true
}
```

## Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": 1234567890
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid auth token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `CONFLICT` (409): Resource conflict (e.g., duplicate email)
- `VALIDATION_ERROR` (422): Invalid request data
- `INTERNAL_ERROR` (500): Server error

## Rate Limits

- Auth endpoints: 10 requests/minute per IP
- Sync endpoints: 100 requests/minute per user
- Download: 1000 requests/hour per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

## WebSocket (V1)

Real-time sync updates via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:4000/sync/realtime')
ws.send(JSON.stringify({
  type: 'subscribe',
  orbitId: 'uuid',
  token: 'jwt-token'
}))

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle sync update
}
```

## Versioning

API version is included in the health check response. Breaking changes will result in a new API version (e.g., `/v2/sync/...`).
