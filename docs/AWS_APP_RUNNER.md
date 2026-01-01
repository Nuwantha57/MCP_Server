# AWS App Runner deployment (minimal)

This guide explains how to use the included GitHub Actions workflow (`.github/workflows/aws-app-runner.yml`) to build, push, and deploy the MCP Server to AWS App Runner.

Required GitHub repository secrets (set these in Settings → Secrets):

- `AWS_ACCESS_KEY_ID` — an IAM user's access key with permissions for ECR and App Runner (or use a deploy role).
- `AWS_SECRET_ACCESS_KEY` — the IAM user's secret key.
- `AWS_REGION` — e.g. `us-east-1`.
- `AWS_ACCOUNT_ID` — numeric account id (used to form ECR URI).
- `ECR_REPOSITORY` — repository name to push the image to, e.g. `mcp-server`.
- `APP_RUNNER_SERVICE_NAME` — desired App Runner service name, e.g. `mcp-server`.

What the workflow does:

1. Builds the Docker image using the repository `Dockerfile`.
2. Ensures the ECR repository exists and pushes the image tagged by commit SHA.
3. Creates an App Runner service (if missing) using the pushed image, or updates the existing service to use the new image.

Notes & assumptions:

- The workflow assumes the IAM credentials can create/list ECR repos and manage App Runner services.
- For private ECR access, App Runner typically needs permission to pull from ECR. In many cases, if the image is in the same account and the caller has permissions, App Runner can access it; if not, configure an appropriate IAM role.
- App Runner will handle TLS termination for you; the service will be publicly accessible over HTTPS by default.

Manual alternative:

You can also create an App Runner service from the AWS Console and select "Container image repository" → "Amazon ECR" and point it at the pushed image URI.
