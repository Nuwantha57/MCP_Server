# Railway MCP Server - Usage Guide

Your MCP server is deployed and running at:

```
https://mcpserver-production-e608.up.railway.app
```

## Quick Start

All endpoints require the API key header:

```
x-api-key: dev-api-key-12345
```

---

## Access Methods

### 1. **Swagger UI (Interactive)**

Open in browser:

```
https://mcpserver-production-e608.up.railway.app/swagger/
```

- Click **Authorize**
- Enter: `dev-api-key-12345`
- Try the tools directly in the UI

### 2. **Postman**

- Method: `POST`
- URL: `https://mcpserver-production-e608.up.railway.app/api/tools/{tool_name}`
- Headers:
  ```
  x-api-key: dev-api-key-12345
  Content-Type: application/json
  ```

Example requests:

**Echo:**

```bash
curl -X POST https://mcpserver-production-e608.up.railway.app/api/tools/echo \
  -H "x-api-key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"message":"hello"}'
```

**Reverse:**

```bash
curl -X POST https://mcpserver-production-e608.up.railway.app/api/tools/reverse \
  -H "x-api-key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"text":"hello"}'
```

**Add:**

```bash
curl -X POST https://mcpserver-production-e608.up.railway.app/api/tools/add \
  -H "x-api-key: dev-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"a":5,"b":3}'
```

### 3. **Python Client**

```python
import requests

API_KEY = "dev-api-key-12345"
BASE_URL = "https://mcpserver-production-e608.up.railway.app/api/tools"

headers = {"x-api-key": API_KEY, "Content-Type": "application/json"}

# Echo
response = requests.post(f"{BASE_URL}/echo",
    headers=headers,
    json={"message": "hello"})
print(response.json())

# Add
response = requests.post(f"{BASE_URL}/add",
    headers=headers,
    json={"a": 5, "b": 3})
print(response.json())
```

### 4. **Node.js Client**

```javascript
const BASE_URL = "https://mcpserver-production-e608.up.railway.app/api/tools";
const API_KEY = "dev-api-key-12345";

async function callTool(tool, args) {
  const response = await fetch(`${BASE_URL}/${tool}`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  return await response.json();
}

// Usage
callTool("echo", { message: "hello" }).then(console.log);
callTool("add", { a: 5, b: 3 }).then(console.log);
```

---

## Available Tools

1. **echo** - Echoes a message

   - Input: `{"message": "your text"}`

2. **reverse** - Reverses text

   - Input: `{"text": "your text"}`

3. **add** - Adds two numbers

   - Input: `{"a": 5, "b": 3}`

4. **getDateTime** - Gets current date/time

   - Input: `{"offsetHours": 0}` (optional)

5. **analyzeText** - Analyzes text statistics
   - Input: `{"text": "your text"}`

---

## Health Check (No Auth Required)

```
GET https://mcpserver-production-e608.up.railway.app/health
```

Returns: `{"status":"Healthy"}`

---

## Settings & Deployment

- **Server URL:** `https://mcpserver-production-e608.up.railway.app`
- **API Key:** `dev-api-key-12345` (change in Railway variables)
- **Platform:** Railway
- **Status:** Active and running ✅

To monitor or manage your deployment, visit:

```
https://railway.app
```

---

## Next Steps

1. **Test with Swagger UI** - Simplest way to try tools
2. **Integrate into your app** - Use Python/Node.js client examples
3. **Change API Key** - Update in Railway environment variables
4. **Add more tools** - Edit `Program.cs` and redeploy

---

That's it! Your MCP server is ready to use. 🚀
