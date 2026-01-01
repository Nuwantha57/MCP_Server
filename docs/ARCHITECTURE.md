# Architecture Overview

- Service type: HTTP REST API (ASP.NET Core minimal API)
- Key endpoints:
  - `GET /health` — health check
  - `POST /mcp/execute` — MCP execute endpoint (JSON)
- Cross-cutting:
  - Structured logging (Serilog)
  - OpenAPI (Swagger) for API discovery
  - Health checks for orchestration
  - Configuration via `appsettings.json` and environment variables
  - Container-first design with readiness/liveness probes

Design decisions:

- Minimal API reduces ceremony and attack surface.
- Use JWT authentication in production (placeholder in code).
- Use reverse proxy (Ingress / API Gateway) for TLS termination and rate limiting.
