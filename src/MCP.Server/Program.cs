using System.ComponentModel;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol.AspNetCore;
using ModelContextProtocol.Server;
using Serilog;
#pragma warning disable CS1591 // Missing XML comment

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel for cloud deployment (Railway, etc.)
// Railway provides PORT env var, use HTTP only (TLS termination handled by proxy)
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
if (builder.Environment.IsProduction())
{
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.ListenAnyIP(int.Parse(port));
    });
}

// Serilog structured console logging
builder.Host.UseSerilog((ctx, lc) => lc.WriteTo.Console());

// Services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "MCP Server API",
        Version = "v1",
        Description = "Model Context Protocol HTTP server with tool execution"
    });

    // Add API Key authentication to Swagger
    c.AddSecurityDefinition("ApiKey", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Name = "x-api-key",
        Description = "API Key for authentication"
    });

    // Apply security requirement to all operations
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "ApiKey"
                }
            },
            new string[] { }
        }
    });
});
builder.Services.AddHealthChecks();

// Add CORS support
builder.Services.AddCors(options =>
{
    options.AddPolicy("McpPolicy", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Security:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000" };
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure MCP Server with SSE transport
builder.Services.AddMcpServer(options =>
{
    options.ServerInfo = new()
    {
        Name = "MCP.Server",
        Version = "0.1.0"
    };
})
.WithHttpTransport()  // Enable HTTP/SSE transport
.WithTools<McpTools>();  // Register tool class

var app = builder.Build();

app.UseSerilogRequestLogging();

// HTTPS Redirection (optional, controlled by config)
var requireHttps = app.Configuration.GetValue<bool>("Security:RequireHttps");
if (requireHttps)
{
    app.UseHttpsRedirection();
}

// Enable CORS
app.UseCors("McpPolicy");

// Enable Swagger BEFORE security middleware so it's always accessible
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MCP Server API v1");
    c.DisplayRequestDuration();
    c.DefaultModelsExpandDepth(2);
});

// Security middleware: API key authentication for protected endpoints
app.Use(async (ctx, next) =>
{
    var path = ctx.Request.Path.Value?.ToLower() ?? "";

    // Public endpoints that don't require authentication
    var publicEndpoints = new[] { "/health", "/info", "/swagger" };
    var isPublicEndpoint = publicEndpoints.Any(e => path.StartsWith(e));

    // Skip authentication for public endpoints
    if (isPublicEndpoint)
    {
        await next();
        return;
    }

    // Check API key for protected endpoints
    var configKey = app.Configuration["Security:ApiKey"];
    Log.Information("DEBUG: ConfigKey={ConfigKey}, Length={Length}",
        string.IsNullOrEmpty(configKey) ? "EMPTY" : "SET", configKey?.Length ?? 0);

    if (!string.IsNullOrEmpty(configKey))
    {
        // Check for API key in header
        if (!ctx.Request.Headers.TryGetValue("x-api-key", out var suppliedKey) || suppliedKey != configKey)
        {
            Log.Warning("DEBUG: SuppliedKey={SuppliedKey}, Mismatch={Mismatch}",
                suppliedKey.ToString(), suppliedKey != configKey);
            // Log unauthorized access attempt
            Log.Warning("Unauthorized access attempt to {Path} from {IP}",
                path, ctx.Connection.RemoteIpAddress);

            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = "Unauthorized",
                message = "Valid API key required. Provide 'x-api-key' header.",
                timestamp = DateTime.UtcNow
            }));
            return;
        }

        // Log successful authentication
        Log.Information("Authenticated request to {Path}", path);
    }

    await next();
});

// Map MCP SSE endpoints (/sse for connection, /message for messages)
app.MapMcp();

// Add REST endpoints for tools (for easier testing via Swagger)
app.MapPost("/api/tools/echo", (EchoRequest req) => Results.Ok(new { result = McpTools.Echo(req.message ?? "") }))
    .WithName("Echo Tool");

app.MapPost("/api/tools/reverse", (ReverseRequest req) => Results.Ok(new { result = McpTools.Reverse(req.text ?? "") }))
    .WithName("Reverse Tool");

app.MapPost("/api/tools/add", (AddRequest req) => Results.Ok(new { result = McpTools.Add(req.a, req.b) }))
    .WithName("Add Tool");

app.MapPost("/api/tools/getDateTime", (GetDateTimeRequest req) => Results.Ok(McpTools.GetDateTime(req.offsetHours)))
    .WithName("Get DateTime");

app.MapPost("/api/tools/analyzeText", (AnalyzeTextRequest req) => Results.Ok(McpTools.AnalyzeText(req.text ?? "")))
    .WithName("Analyze Text");

app.MapGet("/info", () => Results.Ok(new { service = "MCP Server", version = "0.1.0" }));
app.MapHealthChecks("/health");

app.Run();

// Make Program accessible to tests
public partial class Program { }

// --- MCP Tools using official SDK ---
/// <summary>
/// MCP Tools with input validation following MCP standards
/// </summary>
public class McpTools
{
    /// <summary>
    /// Echoes back the input message
    /// </summary>
    [McpServerTool, Description("Echoes back the input message. Returns the message prefixed with 'Echo: '")]
    public static string Echo([Description("The message to echo (required, non-empty)")] string message)
    {
        // Input validation
        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ArgumentException("Message cannot be null or empty", nameof(message));
        }

        if (message.Length > 1000)
        {
            throw new ArgumentException("Message cannot exceed 1000 characters", nameof(message));
        }

        return $"Echo: {message}";
    }

    /// <summary>
    /// Reverses the input text
    /// </summary>
    [McpServerTool, Description("Reverses the input text. Example: 'hello' becomes 'olleh'")]
    public static string Reverse([Description("The text to reverse (required, non-empty)")] string text)
    {
        // Input validation
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ArgumentException("Text cannot be null or empty", nameof(text));
        }

        if (text.Length > 1000)
        {
            throw new ArgumentException("Text cannot exceed 1000 characters", nameof(text));
        }

        var arr = text.ToCharArray();
        Array.Reverse(arr);
        return new string(arr);
    }

    /// <summary>
    /// Adds two numbers together
    /// </summary>
    [McpServerTool, Description("Adds two integers together and returns the sum")]
    public static int Add(
        [Description("First number (integer)")] int a,
        [Description("Second number (integer)")] int b)
    {
        // Check for overflow
        checked
        {
            try
            {
                return a + b;
            }
            catch (OverflowException)
            {
                throw new ArgumentException($"Result would overflow: {a} + {b} exceeds integer range");
            }
        }
    }

    /// <summary>
    /// Gets the current server date and time
    /// </summary>
    [McpServerTool, Description("Gets the current server date and time in ISO 8601 format")]
    public static object GetDateTime([Description("Timezone offset in hours from UTC (optional, default 0)")] int? offsetHours = null)
    {
        var utcNow = DateTime.UtcNow;
        var offset = offsetHours ?? 0;

        // Validate offset range
        if (offset < -12 || offset > 14)
        {
            throw new ArgumentException("Timezone offset must be between -12 and +14 hours", nameof(offsetHours));
        }

        var adjustedTime = utcNow.AddHours(offset);

        return new
        {
            utc = utcNow.ToString("o"),
            local = adjustedTime.ToString("o"),
            offsetHours = offset,
            formatted = adjustedTime.ToString("yyyy-MM-dd HH:mm:ss")
        };
    }

    /// <summary>
    /// Calculates basic string statistics
    /// </summary>
    [McpServerTool, Description("Analyzes text and returns statistics like character count, word count, etc.")]
    public static object AnalyzeText([Description("The text to analyze (required)")] string text)
    {
        // Input validation
        if (string.IsNullOrEmpty(text))
        {
            throw new ArgumentException("Text cannot be null or empty", nameof(text));
        }

        if (text.Length > 10000)
        {
            throw new ArgumentException("Text cannot exceed 10000 characters", nameof(text));
        }

        var words = text.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        var sentences = text.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);

        return new
        {
            characterCount = text.Length,
            characterCountNoSpaces = text.Replace(" ", "").Length,
            wordCount = words.Length,
            sentenceCount = sentences.Length,
            averageWordLength = words.Length > 0 ? Math.Round(words.Average(w => w.Length), 2) : 0,
            longestWord = words.OrderByDescending(w => w.Length).FirstOrDefault() ?? ""
        };
    }
}

// Request DTOs for REST endpoints
public class EchoRequest { public string? message { get; set; } }
public class ReverseRequest { public string? text { get; set; } }
public class AddRequest { public int a { get; set; } public int b { get; set; } }
public class GetDateTimeRequest { public int? offsetHours { get; set; } }
public class AnalyzeTextRequest { public string? text { get; set; } }
