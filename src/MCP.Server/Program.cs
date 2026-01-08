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

app.MapPost("/api/tools/getMeetingTime", (GetMeetingTimeRequest req) => 
    Results.Ok(McpTools.GetMeetingTime(req.country1 ?? "", req.country2 ?? "", req.preferredTime, req.meetingDate)))
    .WithName("Get Meeting Time");

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

    /// <summary>
    /// Gets meeting time for 2 countries considering their timezones
    /// </summary>
    [McpServerTool, Description("Finds optimal meeting time for people in two different countries based on their timezones")]
    public static object GetMeetingTime(
        [Description("First country name or timezone (e.g., 'US', 'America/New_York')")] string country1,
        [Description("Second country name or timezone (e.g., 'India', 'Asia/Kolkata')")] string country2,
        [Description("Preferred time in country1 (24-hour format, e.g., '14:00'). If not provided, uses current time")] string? preferredTime = null,
        [Description("Date for meeting (YYYY-MM-DD format, e.g., '2026-10-02'). If not provided, uses today's date")] string? meetingDate = null)
    {
        // Timezone mappings for common countries
        var timezoneMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { "US", "America/New_York" },
            { "USA", "America/New_York" },
            { "UK", "Europe/London" },
            { "UK/London", "Europe/London" },
            { "Europe", "Europe/London" },
            { "India", "Asia/Kolkata" },
            { "Japan", "Asia/Tokyo" },
            { "Australia", "Australia/Sydney" },
            { "China", "Asia/Shanghai" },
            { "Germany", "Europe/Berlin" },
            { "France", "Europe/Paris" },
            { "Singapore", "Asia/Singapore" },
            { "Dubai", "Asia/Dubai" },
            { "Brazil", "America/Sao_Paulo" }
        };

        // Resolve timezone for country1
        var tz1 = timezoneMap.ContainsKey(country1) ? timezoneMap[country1] : country1;
        var tz2 = timezoneMap.ContainsKey(country2) ? timezoneMap[country2] : country2;

        try
        {
            var timeZone1 = TimeZoneInfo.FindSystemTimeZoneById(tz1);
            var timeZone2 = TimeZoneInfo.FindSystemTimeZoneById(tz2);

            // Get current UTC time or use provided date
            DateTime baseTime;
            
            if (!string.IsNullOrEmpty(meetingDate))
            {
                // Parse provided date
                if (!DateTime.TryParse(meetingDate, out var parsedDate))
                {
                    throw new ArgumentException("Meeting date must be in YYYY-MM-DD format (e.g., '2026-10-02')", nameof(meetingDate));
                }
                baseTime = parsedDate;
            }
            else
            {
                baseTime = DateTime.UtcNow;
            }

            // Parse preferred time if provided, otherwise use 00:00
            if (!string.IsNullOrEmpty(preferredTime))
            {
                var parts = preferredTime.Split(':');
                if (parts.Length != 2 || !int.TryParse(parts[0], out var hours) || !int.TryParse(parts[1], out var minutes))
                {
                    throw new ArgumentException("Preferred time must be in HH:mm format (24-hour)", nameof(preferredTime));
                }
                baseTime = baseTime.Date.AddHours(hours).AddMinutes(minutes);
            }
            else
            {
                baseTime = baseTime.Date; // Midnight UTC
            }

            // Get holidays from environment variables
            var holidays1Str = Environment.GetEnvironmentVariable($"HOLIDAYS_{country1.ToUpper()}") ?? "";
            var holidays2Str = Environment.GetEnvironmentVariable($"HOLIDAYS_{country2.ToUpper()}") ?? "";
            
            var holidays1 = ParseHolidays(holidays1Str);
            var holidays2 = ParseHolidays(holidays2Str);

            // Convert to both timezones
            var time1 = TimeZoneInfo.ConvertTime(baseTime, TimeZoneInfo.Utc, timeZone1);
            var time2 = TimeZoneInfo.ConvertTime(baseTime, TimeZoneInfo.Utc, timeZone2);

            // Check for holidays
            var isHoliday1 = holidays1.Contains(time1.Date);
            var isHoliday2 = holidays2.Contains(time2.Date);
            var holidayStatus = "";

            if (isHoliday1 && isHoliday2)
            {
                holidayStatus = $"⚠️ BOTH COUNTRIES ON HOLIDAY ({time1:MMM dd}) - Consider next business day";
            }
            else if (isHoliday1)
            {
                holidayStatus = $"⚠️ {country1} on holiday ({time1:MMM dd})";
            }
            else if (isHoliday2)
            {
                holidayStatus = $"⚠️ {country2} on holiday ({time2:MMM dd})";
            }

            // Find next available day (skip weekends and holidays)
            var nextAvailableDate1 = FindNextBusinessDay(time1.Date, holidays1);
            var nextAvailableDate2 = FindNextBusinessDay(time2.Date, holidays2);

            return new
            {
                country1 = country1,
                country2 = country2,
                timezone1 = tz1,
                timezone2 = tz2,
                time1 = time1.ToString("HH:mm:ss"),
                time2 = time2.ToString("HH:mm:ss"),
                date1 = time1.ToString("yyyy-MM-dd (ddd)"),
                date2 = time2.ToString("yyyy-MM-dd (ddd)"),
                utcTime = baseTime.ToString("o"),
                isHoliday1 = isHoliday1,
                isHoliday2 = isHoliday2,
                holidayStatus = holidayStatus,
                nextBusinessDay1 = nextAvailableDate1.ToString("yyyy-MM-dd (ddd)"),
                nextBusinessDay2 = nextAvailableDate2.ToString("yyyy-MM-dd (ddd)"),
                message = $"When it's {time1:HH:mm} in {country1}, it's {time2:HH:mm} in {country2}" + (string.IsNullOrEmpty(holidayStatus) ? "" : $". {holidayStatus}")
            };
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ArgumentException($"Timezone not found: {tz1} or {tz2}. Use valid timezone names (e.g., 'America/New_York', 'Europe/London')", nameof(country1));
        }
    }

    /// <summary>
    /// Parse holiday dates from environment variable string
    /// Format: YYYY-MM-DD,YYYY-MM-DD,YYYY-MM-DD
    /// </summary>
    private static HashSet<DateTime> ParseHolidays(string holidaysStr)
    {
        var holidays = new HashSet<DateTime>();
        if (string.IsNullOrEmpty(holidaysStr))
            return holidays;

        var dates = holidaysStr.Split(',', StringSplitOptions.RemoveEmptyEntries);
        foreach (var dateStr in dates)
        {
            if (DateTime.TryParse(dateStr.Trim(), out var date))
            {
                holidays.Add(date.Date);
            }
        }
        return holidays;
    }

    /// <summary>
    /// Find the next business day (Monday-Friday) that is not a holiday
    /// </summary>
    private static DateTime FindNextBusinessDay(DateTime date, HashSet<DateTime> holidays)
    {
        var current = date;
        // Check up to 30 days ahead
        for (int i = 0; i < 30; i++)
        {
            // Skip weekends (Saturday=6, Sunday=0)
            if (current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday)
            {
                // Skip holidays
                if (!holidays.Contains(current))
                {
                    return current;
                }
            }
            current = current.AddDays(1);
        }
        return current; // Fallback after 30 days
    }
}

// Request DTOs for REST endpoints
public class EchoRequest { public string? message { get; set; } }
public class ReverseRequest { public string? text { get; set; } }
public class AddRequest { public int a { get; set; } public int b { get; set; } }
public class GetDateTimeRequest { public int? offsetHours { get; set; } }
public class AnalyzeTextRequest { public string? text { get; set; } }
public class GetMeetingTimeRequest { public string? country1 { get; set; } public string? country2 { get; set; } public string? preferredTime { get; set; } public string? meetingDate { get; set; } }
