# Deployment Guide

This document covers recommended steps to deploy `MCP.Server` to production.

1. Build and push container image

```bash
docker build -t <registry>/mcp-server:1.0.0 .
docker push <registry>/mcp-server:1.0.0
```

2. Kubernetes (Helm)

- Update `helm/mcp-server/values.yaml` with image repository and tag.
- Configure secrets (JWT signing keys, DB credentials) in Kubernetes Secrets or external secret store.
- Install with Helm:

```bash
helm install mcp-server helm/mcp-server --namespace mcp --create-namespace
```

3. Security

- Terminate TLS at ingress (NGINX/ALB) or use cert-manager for TLS certs.
- Use RBAC and network policies to restrict access.
- Enable logging to a central system (ELK/Datadog).

4. Observability

- Expose metrics endpoint (Prometheus) and integrate tracing (OpenTelemetry).
- Configure alerting on health check failures and error-rate thresholds.

5. CI/CD

- Use GitHub Actions or your CI to build, test, and publish images.
- Promote images between registries with automated tags.

6. Operational notes

- Use horizontal pod autoscaler (HPA) with CPU/memory or custom metrics.
- Apply resource requests/limits for stable scheduling.
- Run periodic chaos/drill tests for resilience.

--

**TLS / HTTPS and Kestrel (Production)**

This section explains options to enable HTTPS for the MCP server in production. Prefer terminating TLS at the platform ingress (Load Balancer / Ingress Controller) when possible. If you must run TLS in the application (Kestrel), follow the guidance below.

1. Terminate TLS at the platform (recommended):

   - Kubernetes: use an Ingress Controller (NGINX/Contour/ALB) + cert-manager to provision Let's Encrypt certificates. Configure the Ingress to terminate TLS and forward plain HTTP to the service.
   - Azure App Service: bind a managed certificate or upload a certificate to the App Service and configure TLS at the platform.
   - AWS: use an ALB/ELB with TLS listeners and forward to the application on HTTP.

2. Running TLS inside Kestrel (when terminating at the app):
   - Create or obtain a PFX file (PKCS#12) containing the certificate and private key.
     Example (self-signed, for testing only):

```bash
openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
openssl pkcs12 -export -out cert.pfx -inkey key.pem -in cert.pem -passout pass:changeit
```

    - For the container deployment, mount the `cert.pfx` into the container (e.g., `/certs/cert.pfx`) and set environment variables:

```bash
# path inside container
TLS_PFX_PATH=/certs/cert.pfx
TLS_PFX_PASSWORD=changeit
export TLS_PFX_PATH TLS_PFX_PASSWORD
```

    - The server will automatically configure Kestrel to listen on port 443 using the PFX when `TLS_PFX_PATH` is set. An HTTP listener is kept on port 80 for health checks and automatic redirect.

3. Azure App Service note (PFX uploaded to App Service):

   - Upload the PFX to App Service TLS private certificates, then set the app setting `CERTIFICATE_PASSWORD` with the PFX password and mount via the platform. Alternatively, let App Service terminate TLS at platform level and keep the container listening on HTTP.

4. Kubernetes with cert-manager + Ingress (recommended):

   - Install cert-manager and configure a ClusterIssuer for Let's Encrypt.
   - Create an Ingress with TLS and annotations for the ingress controller. The ingress will handle the certificate and forward traffic to the `mcp-server` service.

5. Security considerations:

   - Prefer platform-managed TLS to avoid distributing private keys to application containers.
   - If loading PFX into the container, store it in a secret backing volume and set environment variables via secure secret injection.
   - Rotate certificates regularly and automate renewal (cert-manager or platform-managed certs).

6. Health checks and readiness:

   - Keep a non-TLS health endpoint or ensure your platform probes via HTTP/HTTPS to the correct endpoint. Kestrel is configured to listen on both 80 and 443 when a PFX is present to make probe configuration straightforward.

7. Quick checklist for TLS with Kestrel and Docker:
   - Build PFX and store in a secure location.
   - Mount PFX into container at runtime: `-v /secrets/cert.pfx:/certs/cert.pfx:ro`.
   - Set `TLS_PFX_PATH` and `TLS_PFX_PASSWORD` in environment variables or container secrets.
   - Ensure ports 80 and 443 are exposed in your container orchestration configuration and firewall rules.

If you want, I can add a Helm secret template and example Ingress manifest for `helm/mcp-server` to show how to wire cert-manager and mount PFX secrets into the deployment.
