# MCP.Server

This repository contains a production-oriented MCP (Model Context Protocol) HTTP server implemented with .NET 7.

Contents:

- `src/MCP.Server` — .NET minimal API project
- `tests/MCP.Server.Tests` — unit test project
- `.github/workflows/ci.yml` — CI pipeline (build + test)
- `Dockerfile`, `docker-compose.yml` — containerization
- `helm/mcp-server` — Helm chart skeleton
- `docs/` — architecture and deployment guides

Quick start (local):

dotnet run --project MCP.Server.csproj

1. Build and run locally:

```powershell
cd src/MCP.Server
dotnet run --project MCP.Server.csproj
```

2. Build and run container locally:

```powershell
docker build -t mcp-server:local .
docker run -p 5000:80 mcp-server:local
```

See `docs/DEPLOYMENT.md` for production deployment guidance.

Security and demo endpoints:

- Protected MCP endpoints expect an API key header `x-api-key` when `Security:ApiKey` is set in configuration (use env var `ASPNETCORE_Environment` or configure via K8s secret).
- SSE demo endpoint: `GET /mcp/stream`
- Execute demo tools:

```powershell
curl -X POST http://localhost:5000/mcp/execute -H "Content-Type: application/json" -d '{"tool":"echo","input":{"foo":"bar"}}'
```

Deploy to AWS App Runner: see `docs/AWS_APP_RUNNER.md` and the workflow `.github/workflows/aws-app-runner.yml` for an automated ECR push + App Runner create/update flow.
