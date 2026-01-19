# MindMux REST API Documentation

HTTP API reference for MindMux services.

## Base URL

```
http://localhost:8080/api
```

## Authentication

Currently, MindMux API uses no authentication (development phase).

Future: API token-based authentication via `Authorization: Bearer {token}` header.

## Content Types

- **Request**: `application/json`
- **Response**: `application/json` or `text/event-stream`

## Response Format

### Success Response

```json
{
  "status": "success",
  "data": { /* endpoint-specific data */ },
  "timestamp": "2025-01-19T10:00:00Z"
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Human readable error message",
    "details": { /* optional additional info */ }
  },
  "timestamp": "2025-01-19T10:00:00Z"
}
```

## Endpoints

### Health Check

Check if MindMux API is running.

```
GET /health
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "service": "mindmux",
    "version": "0.1.0",
    "uptime": 3600,
    "timestamp": "2025-01-19T10:00:00Z"
  }
}
```

**Example:**
```bash
curl http://localhost:8080/api/health
```

### System Status

Get current system status and statistics.

```
GET /status
```

**Query Parameters:**
- `agent_status` (string, optional): Filter by agent status (`idle`, `busy`, `error`)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "system": {
      "uptime": 3600,
      "loadAverage": [1.2, 1.5, 1.8],
      "memory": {
        "used": 512,
        "available": 2048,
        "percent": 25
      }
    },
    "agents": {
      "total": 5,
      "idle": 3,
      "busy": 1,
      "error": 1
    },
    "tasks": {
      "total": 10,
      "queued": 2,
      "running": 3,
      "completed": 5
    }
  }
}
```

**Example:**
```bash
# All agents
curl http://localhost:8080/api/status

# Only busy agents
curl "http://localhost:8080/api/status?agent_status=busy"
```

### List Agents

Get list of all agents.

```
GET /agents
```

**Query Parameters:**
- `status` (string, optional): Filter by status (`idle`, `busy`, `error`)
- `type` (string, optional): Filter by type (`claude`, `gemini`, `gpt4`, `opencode`)
- `limit` (number, optional): Maximum results (default: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "agents": [
      {
        "id": "a1b2c3d4",
        "name": "my-dev-agent",
        "type": "claude",
        "status": "idle",
        "capabilities": ["code-generation", "code-review"],
        "model": "claude-opus-4-5-20250929",
        "createdAt": "2025-01-19T09:00:00Z",
        "lastActivity": "2025-01-19T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

**Example:**
```bash
curl http://localhost:8080/api/agents
curl "http://localhost:8080/api/agents?status=busy"
```

### Get Agent Details

Get detailed information about a specific agent.

```
GET /agents/{agentId}
```

**Path Parameters:**
- `agentId` (string, required): Agent ID or name

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "a1b2c3d4",
    "name": "my-dev-agent",
    "type": "claude",
    "status": "busy",
    "capabilities": ["code-generation", "code-review"],
    "model": "claude-opus-4-5-20250929",
    "createdAt": "2025-01-19T09:00:00Z",
    "lastActivity": "2025-01-19T10:00:00Z",
    "statistics": {
      "tasksCompleted": 5,
      "tasksFailed": 1,
      "averageTaskDuration": 120
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "status": "error",
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'a1b2c3d4' not found"
  }
}
```

**Example:**
```bash
curl http://localhost:8080/api/agents/a1b2c3d4
curl http://localhost:8080/api/agents/my-dev-agent
```

### Stream Agent Events

Stream real-time events from agents (Server-Sent Events).

```
GET /events
```

**Query Parameters:**
- `agentId` (string, optional): Stream events from specific agent
- `eventType` (string, optional): Filter by event type (`status`, `log`, `error`, `complete`)

**Response (200 OK):** Server-Sent Events stream

```
event: agent.started
data: {"agentId":"a1b2c3d4","timestamp":"2025-01-19T10:00:00Z"}

event: agent.log
data: {"agentId":"a1b2c3d4","message":"Processing task","timestamp":"2025-01-19T10:00:01Z"}

event: agent.completed
data: {"agentId":"a1b2c3d4","result":"done","timestamp":"2025-01-19T10:00:05Z"}
```

**Example:**
```bash
# Stream all events
curl -N http://localhost:8080/api/events

# Stream events from one agent
curl -N "http://localhost:8080/api/events?agentId=a1b2c3d4"

# Stream only errors
curl -N "http://localhost:8080/api/events?eventType=error"
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters or body |
| `AGENT_NOT_FOUND` | 404 | Agent ID or name not found |
| `AGENT_ALREADY_EXISTS` | 409 | Agent with name already exists |
| `INVALID_AGENT_TYPE` | 400 | Unknown agent type |
| `INVALID_CAPABILITY` | 400 | Unknown capability |
| `SERVICE_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## Rate Limiting

API is not rate-limited in development mode.

Future: Rate limiting via `X-RateLimit-*` headers.

## Examples

### Get System Status

```bash
curl -s http://localhost:8080/api/status | jq .
```

### Monitor Agent in Real-time

```bash
curl -N http://localhost:8080/api/events | grep -A 1 "agent.log"
```

### Get All Idle Agents

```bash
curl -s "http://localhost:8080/api/agents?status=idle" | jq '.data.agents[].name'
```

### Check Service Health

```bash
curl -s http://localhost:8080/api/health && echo " - Service is up"
```

## Testing with curl

### Basic Health Check

```bash
curl -v http://localhost:8080/api/health
```

### With jq for pretty JSON

```bash
curl -s http://localhost:8080/api/status | jq '.'
```

### POST Requests (Future)

```bash
curl -X POST http://localhost:8080/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "new-agent",
    "type": "claude",
    "capabilities": ["code-generation"]
  }'
```

## OpenAPI Specification

Full OpenAPI 3.0 specification available in [api/openapi.yaml](./api/openapi.yaml).

Generate API client from spec:

```bash
# Install openapi-generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/api/openapi.yaml \
  -g typescript-axios \
  -o generated/api-client
```

## Webhooks (Future)

Planned feature to stream events to external endpoints.

## API Versioning

Current version: `v1` (implicit in `/api` prefix)

Future: Support for `/api/v2`, `/api/v3` for backwards compatibility.

---

For real-time events, see [Streaming](#stream-agent-events).

For CLI usage, see [USER_GUIDE.md](./USER_GUIDE.md).
