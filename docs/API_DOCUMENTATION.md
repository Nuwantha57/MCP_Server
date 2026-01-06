# MCP Server API Documentation

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Environment:** Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [API Endpoints](#api-endpoints)
   - [Public Endpoints](#public-endpoints)
   - [Protected Tools Endpoints](#protected-tools-endpoints)
   - [MCP Protocol Endpoints](#mcp-protocol-endpoints)
5. [Tools Reference](#tools-reference)
6. [Error Handling](#error-handling)
7. [Examples](#examples)
8. [Rate Limiting](#rate-limiting)
9. [Security Best Practices](#security-best-practices)

---

## Overview

The MCP Server API provides HTTP access to a Model Context Protocol (MCP) compliant server. It exposes multiple tools for text processing, mathematics, date/time operations, and text analysis. The API uses REST conventions with JSON request/response bodies.

**Key Features:**

- API Key authentication for protected endpoints
- Public health check and info endpoints
- Five core tools with input validation
- OpenAPI/Swagger documentation
- Structured error responses with timestamps
- CORS support for cross-origin requests

---

## Authentication

### API Key Authentication

Protected endpoints require an `x-api-key` header containing a valid API key.

**Header Format:**

```
x-api-key: your-api-key-here
```

**Configuration:**
The API key is configured via the `Security:ApiKey` configuration setting:

- **Environment Variable:** `Security__ApiKey`
- **appsettings.json:** `"Security": { "ApiKey": "your-key" }`
- **Default:** If not set, protected endpoints are accessible without authentication

### Public vs Protected Endpoints

**Public Endpoints** (no authentication required):

- `GET /health` - Health check
- `GET /info` - Service information
- `GET /swagger/*` - Swagger UI and documentation

**Protected Endpoints** (require `x-api-key` header):

- All `/api/tools/*` endpoints
- MCP protocol endpoints (`/sse`, `/message`)

---

## Base URL

```
http://localhost:5000
```

For production deployments, replace `localhost:5000` with your server's domain and port.

---

## API Endpoints

### Public Endpoints

#### 1. Health Check

**Endpoint:** `GET /health`

**Description:** Checks if the server is running and healthy.

**Authentication:** Not required

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "Healthy"
}
```

**Example:**

```bash
curl http://localhost:5000/health
```

---

#### 2. Service Information

**Endpoint:** `GET /info`

**Description:** Returns information about the service.

**Authentication:** Not required

**Response:**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "service": "MCP Server",
  "version": "0.1.0"
}
```

**Example:**

```bash
curl http://localhost:5000/info
```

---

#### 3. Swagger UI

**Endpoint:** `GET /swagger/index.html`

**Description:** Interactive API documentation (Swagger UI).

**Authentication:** Not required

**Response:** HTML page with interactive API explorer

**Example:**

```
http://localhost:5000/swagger/index.html
```

---

### Protected Tools Endpoints

All tools endpoints require the `x-api-key` header.

#### 1. Echo Tool

**Endpoint:** `POST /api/tools/echo`

**Description:** Echoes back the input message with "Echo: " prefix.

**Authentication:** Required

**Request Body:**

```json
{
  "message": "Your message here"
}
```

**Response (Success):**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "Echo: Your message here"
}
```

**Response (Error - Empty Message):**

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "message": ["The message field is required."]
  }
}
```

**Validation Rules:**

- Message cannot be null or empty
- Message cannot exceed 1000 characters

**Example:**

```bash
curl -X POST http://localhost:5000/api/tools/echo \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"message": "Hello World"}'
```

---

#### 2. Reverse Tool

**Endpoint:** `POST /api/tools/reverse`

**Description:** Reverses the input text character by character.

**Authentication:** Required

**Request Body:**

```json
{
  "text": "Your text here"
}
```

**Response (Success):**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": "ereh txet ruoY"
}
```

**Validation Rules:**

- Text cannot be null or empty
- Text cannot exceed 1000 characters

**Example:**

```bash
curl -X POST http://localhost:5000/api/tools/reverse \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"text": "hello"}'
```

**Response:**

```json
{
  "result": "olleh"
}
```

---

#### 3. Add Tool

**Endpoint:** `POST /api/tools/add`

**Description:** Adds two integers and returns the sum.

**Authentication:** Required

**Request Body:**

```json
{
  "a": 10,
  "b": 20
}
```

**Response (Success):**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": 30
}
```

**Validation Rules:**

- Both `a` and `b` must be integers
- Result must not overflow integer range (-2,147,483,648 to 2,147,483,647)

**Example:**

```bash
curl -X POST http://localhost:5000/api/tools/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"a": 5, "b": 3}'
```

**Response:**

```json
{
  "result": 8
}
```

---

#### 4. Get Date/Time Tool

**Endpoint:** `POST /api/tools/getDateTime`

**Description:** Returns the current server date and time in multiple formats with timezone support.

**Authentication:** Required

**Request Body:**

```json
{
  "offsetHours": 5
}
```

Or without timezone offset:

```json
{
  "offsetHours": null
}
```

**Response (Success):**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "utc": "2025-01-06T15:30:45.1234567Z",
  "local": "2025-01-06T20:30:45.1234567+05:00",
  "offsetHours": 5,
  "formatted": "2025-01-06 20:30:45"
}
```

**Validation Rules:**

- `offsetHours` must be between -12 and +14
- If null or omitted, defaults to UTC (0 offset)

**Example:**

```bash
# Get current UTC time
curl -X POST http://localhost:5000/api/tools/getDateTime \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"offsetHours": null}'

# Get time with +5 hour offset (UTC+5)
curl -X POST http://localhost:5000/api/tools/getDateTime \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"offsetHours": 5}'
```

---

#### 5. Analyze Text Tool

**Endpoint:** `POST /api/tools/analyzeText`

**Description:** Analyzes text and returns statistics including character count, word count, sentence count, and more.

**Authentication:** Required

**Request Body:**

```json
{
  "text": "Your text to analyze goes here."
}
```

**Response (Success):**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": {
    "characterCount": 31,
    "characterCountNoSpaces": 26,
    "wordCount": 6,
    "sentenceCount": 1,
    "averageWordLength": 4.33,
    "longestWord": "analyze"
  }
}
```

**Response Properties:**

- `characterCount` - Total characters including spaces
- `characterCountNoSpaces` - Total characters excluding spaces
- `wordCount` - Number of words
- `sentenceCount` - Number of sentences (split by . ! ?)
- `averageWordLength` - Average length of words (rounded to 2 decimals)
- `longestWord` - The longest word in the text

**Validation Rules:**

- Text cannot be null or empty
- Text cannot exceed 10,000 characters

**Example:**

```bash
curl -X POST http://localhost:5000/api/tools/analyzeText \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"text": "Hello world. This is a test!"}'
```

**Response:**

```json
{
  "result": {
    "characterCount": 32,
    "characterCountNoSpaces": 26,
    "wordCount": 6,
    "sentenceCount": 2,
    "averageWordLength": 4.33,
    "longestWord": "Hello"
  }
}
```

---

### MCP Protocol Endpoints

These endpoints implement the Model Context Protocol specification for streaming and messaging.

#### Server-Sent Events (SSE) Stream

**Endpoint:** `GET /sse`

**Description:** Opens an SSE connection for the MCP protocol.

**Authentication:** Required

**Response:**

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: message
data: {...}

event: message
data: {...}
```

#### Message Endpoint

**Endpoint:** `POST /message`

**Description:** Sends messages to the MCP server via JSON format.

**Authentication:** Required

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "client-name",
      "version": "1.0.0"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "serverInfo": {
      "name": "MCP.Server",
      "version": "0.1.0"
    }
  }
}
```

---

## Tools Reference

### Summary Table

| Tool         | Method | Endpoint                 | Purpose                 | Auth Required |
| ------------ | ------ | ------------------------ | ----------------------- | ------------- |
| Echo         | POST   | `/api/tools/echo`        | Echo back input message | Yes           |
| Reverse      | POST   | `/api/tools/reverse`     | Reverse text string     | Yes           |
| Add          | POST   | `/api/tools/add`         | Add two integers        | Yes           |
| Get DateTime | POST   | `/api/tools/getDateTime` | Get current date/time   | Yes           |
| Analyze Text | POST   | `/api/tools/analyzeText` | Analyze text statistics | Yes           |

### Tool Categories

**Text Processing:**

- Echo Tool - String echo with prefix
- Reverse Tool - Reverse text characters
- Analyze Text Tool - Text statistics

**Mathematical:**

- Add Tool - Integer addition

**Date/Time:**

- Get DateTime Tool - Current server time with timezone offset

---

## Error Handling

### Error Response Format

All error responses follow a consistent JSON format:

**Validation Errors (400):**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "fieldName": ["Error message"]
  }
}
```

**Authentication Errors (401):**

```json
{
  "error": "Unauthorized",
  "message": "Valid API key required. Provide 'x-api-key' header.",
  "timestamp": "2025-01-06T15:30:45Z"
}
```

### HTTP Status Codes

| Status Code | Meaning               | When                              |
| ----------- | --------------------- | --------------------------------- |
| 200         | OK                    | Request succeeded                 |
| 400         | Bad Request           | Invalid input or validation error |
| 401         | Unauthorized          | Missing or invalid API key        |
| 404         | Not Found             | Endpoint does not exist           |
| 500         | Internal Server Error | Server-side error                 |

### Common Error Scenarios

**Missing API Key:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized",
  "message": "Valid API key required. Provide 'x-api-key' header.",
  "timestamp": "2025-01-06T15:30:45Z"
}
```

**Invalid API Key:**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Unauthorized",
  "message": "Valid API key required. Provide 'x-api-key' header.",
  "timestamp": "2025-01-06T15:30:45Z"
}
```

**Empty Required Field:**

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "message": ["The message field is required."]
  }
}
```

**Text Exceeds Length Limit:**

```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "text": ["The input text is too long."]
  }
}
```

---

## Examples

### Example 1: Basic Tool Usage (Echo)

**Request:**

```bash
curl -X POST http://localhost:5000/api/tools/echo \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"message": "Hello API"}'
```

**Response:**

```json
{
  "result": "Echo: Hello API"
}
```

---

### Example 2: Text Analysis Workflow

**Request:**

```bash
curl -X POST http://localhost:5000/api/tools/analyzeText \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"text": "The quick brown fox jumps over the lazy dog."}'
```

**Response:**

```json
{
  "result": {
    "characterCount": 45,
    "characterCountNoSpaces": 35,
    "wordCount": 9,
    "sentenceCount": 1,
    "averageWordLength": 3.89,
    "longestWord": "quick"
  }
}
```

---

### Example 3: Chained Operations (Sequential Calls)

**Step 1: Get current time**

```bash
curl -X POST http://localhost:5000/api/tools/getDateTime \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"offsetHours": 0}'
```

**Response:**

```json
{
  "utc": "2025-01-06T15:30:45.1234567Z",
  "local": "2025-01-06T15:30:45.1234567Z",
  "offsetHours": 0,
  "formatted": "2025-01-06 15:30:45"
}
```

**Step 2: Use that time in another operation**

```bash
curl -X POST http://localhost:5000/api/tools/echo \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"message": "Current time is 2025-01-06 15:30:45"}'
```

**Response:**

```json
{
  "result": "Echo: Current time is 2025-01-06 15:30:45"
}
```

---

### Example 4: Error Handling

**Request with missing field:**

```bash
curl -X POST http://localhost:5000/api/tools/reverse \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{}'
```

**Response:**

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "text": ["The text field is required."]
  }
}
```

---

### Example 5: Client Implementation (C#)

```csharp
using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

public class MccServerClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _baseUrl;

    public McpServerClient(string baseUrl, string apiKey)
    {
        _baseUrl = baseUrl;
        _apiKey = apiKey;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
    }

    public async Task<string> EchoAsync(string message)
    {
        var request = new { message };
        var content = new StringContent(
            JsonSerializer.Serialize(request),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _httpClient.PostAsync(
            $"{_baseUrl}/api/tools/echo",
            content);

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadAsAsync<JsonElement>();
        return result.GetProperty("result").GetString();
    }

    public async Task<int> AddAsync(int a, int b)
    {
        var request = new { a, b };
        var content = new StringContent(
            JsonSerializer.Serialize(request),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _httpClient.PostAsync(
            $"{_baseUrl}/api/tools/add",
            content);

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadAsAsync<JsonElement>();
        return result.GetProperty("result").GetInt32();
    }
}

// Usage
var client = new McpServerClient("http://localhost:5000", "your-api-key");
var result = await client.EchoAsync("Hello World");
Console.WriteLine(result); // Output: Echo: Hello World
```

---

### Example 6: Python Client Implementation

```python
import requests
import json

class McpServerClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "x-api-key": api_key
        }

    def echo(self, message: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/tools/echo",
            json={"message": message},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()["result"]

    def reverse(self, text: str) -> str:
        response = requests.post(
            f"{self.base_url}/api/tools/reverse",
            json={"text": text},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()["result"]

    def add(self, a: int, b: int) -> int:
        response = requests.post(
            f"{self.base_url}/api/tools/add",
            json={"a": a, "b": b},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()["result"]

    def analyze_text(self, text: str) -> dict:
        response = requests.post(
            f"{self.base_url}/api/tools/analyzeText",
            json={"text": text},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()["result"]

# Usage
client = McpServerClient("http://localhost:5000", "your-api-key")
print(client.echo("Hello World"))  # Output: Echo: Hello World
print(client.add(5, 3))            # Output: 8
print(client.reverse("test"))      # Output: tset
```

---

### Example 7: JavaScript/Node.js Client

```javascript
class McpServerClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async _request(endpoint, body) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  async echo(message) {
    const result = await this._request("/api/tools/echo", { message });
    return result.result;
  }

  async reverse(text) {
    const result = await this._request("/api/tools/reverse", { text });
    return result.result;
  }

  async add(a, b) {
    const result = await this._request("/api/tools/add", { a, b });
    return result.result;
  }

  async analyzeText(text) {
    const result = await this._request("/api/tools/analyzeText", { text });
    return result.result;
  }

  async getDateTime(offsetHours = null) {
    const result = await this._request("/api/tools/getDateTime", {
      offsetHours,
    });
    return result;
  }
}

// Usage
const client = new McpServerClient("http://localhost:5000", "your-api-key");

(async () => {
  console.log(await client.echo("Hello World"));
  // Output: Echo: Hello World

  console.log(await client.add(5, 3));
  // Output: 8

  const analysis = await client.analyzeText("Hello world");
  console.log(analysis);
  // Output: { characterCount: 11, wordCount: 2, ... }
})();
```

---

## Rate Limiting

Currently, there are no built-in rate limits on the API. However, production deployments should implement appropriate rate limiting based on your infrastructure and requirements.

**Recommended Practices:**

- Implement rate limiting at the API Gateway level
- Set up monitoring and alerting for unusual traffic patterns
- Consider implementing per-API-key rate limits
- Use caching for frequently accessed endpoints like `/health` and `/info`

---

## Security Best Practices

### API Key Management

1. **Never commit API keys to version control:**

   ```bash
   # Add to .gitignore
   echo "api-keys.txt" >> .gitignore
   ```

2. **Use environment variables:**

   ```bash
   export ASPNETCORE_Environment=Production
   export Security__ApiKey=your-secure-key-here
   dotnet run
   ```

3. **Rotate keys regularly:**

   - Change API keys every 90 days minimum
   - Implement key versioning for seamless rotation
   - Audit key usage regularly

4. **Secure storage:**
   - Use Azure Key Vault, AWS Secrets Manager, or similar
   - Never store keys in configuration files in production
   - Use encryption for key storage

### HTTPS/TLS

1. **Always use HTTPS in production:**

   ```json
   {
     "Security": {
       "RequireHttps": true
     }
   }
   ```

2. **Use valid SSL certificates:**
   - Obtain certificates from trusted CAs
   - Set up certificate auto-renewal
   - Implement HSTS headers

### CORS Configuration

1. **Restrict allowed origins:**

   ```json
   {
     "Security": {
       "AllowedOrigins": [
         "https://yourdomain.com",
         "https://app.yourdomain.com"
       ]
     }
   }
   ```

2. **Avoid wildcards:**
   - Don't use `*` for allowed origins in production
   - Explicitly list trusted domains

### Input Validation

1. **Always validate input:**

   - Check data types and ranges
   - Enforce length limits
   - Sanitize string inputs

2. **Handle errors securely:**
   - Don't expose internal error details
   - Log errors securely for debugging
   - Return generic error messages to clients

### Monitoring and Logging

1. **Enable structured logging:**

   - Log all API requests and responses
   - Track authentication failures
   - Monitor tool execution times

2. **Set up alerts:**
   - Alert on repeated authentication failures
   - Monitor for unusual traffic patterns
   - Track API availability

### Infrastructure Security

1. **Network security:**

   - Use firewalls to restrict access
   - Implement VPN for sensitive operations
   - Use load balancers with DDoS protection

2. **Container security (Docker):**

   - Use minimal base images
   - Run as non-root user
   - Scan images for vulnerabilities

3. **Kubernetes security:**
   - Use network policies
   - Implement RBAC
   - Secure secrets using sealed secrets or similar

---

## Support and Documentation

For more information:

- **Architecture:** See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Deployment:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Security:** See [SECURITY_IMPLEMENTATION_COMPLETE.md](SECURITY_IMPLEMENTATION_COMPLETE.md)
- **Testing:** See [SECURITY_TESTING.md](SECURITY_TESTING.md)

---

## Changelog

### Version 1.0.0 (January 2025)

- Initial release
- Five core tools with validation
- API key authentication
- Swagger documentation
- CORS support
- Comprehensive error handling
