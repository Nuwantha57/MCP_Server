using System.ComponentModel;
using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Serilog;

#pragma warning disable CS1591

// Assembly attribute to enable the Lambda runtime to find the handler function
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace MCP.Server;

/// <summary>
/// AWS Lambda handler for the MCP Server
/// Simplified version that wraps the existing McpTools
/// </summary>
public class LambdaEntrypoint
{
    public async Task<APIGatewayProxyResponse> HandleAsync(APIGatewayProxyRequest request, ILambdaContext context)
    {
        context.Logger.LogLine($"Handling {request.HttpMethod} {request.Path}");

        try
        {
            // Parse request body
            var body = string.Empty;
            if (!string.IsNullOrEmpty(request.Body))
            {
                body = request.IsBase64Encoded 
                    ? System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(request.Body))
                    : request.Body;
            }

            string responseBody = "";
            int statusCode = 404;

            // Route requests to appropriate tool
            if (request.Path == "/api/tools/echo" && request.HttpMethod == "POST")
            {
                var req = JsonSerializer.Deserialize<EchoRequest>(body);
                var result = McpTools.Echo(req?.message ?? "");
                responseBody = JsonSerializer.Serialize(result);
                statusCode = 200;
            }
            else if (request.Path == "/api/tools/reverse" && request.HttpMethod == "POST")
            {
                var req = JsonSerializer.Deserialize<ReverseRequest>(body);
                var result = McpTools.Reverse(req?.text ?? "");
                responseBody = JsonSerializer.Serialize(result);
                statusCode = 200;
            }
            else if (request.Path == "/api/tools/add" && request.HttpMethod == "POST")
            {
                var req = JsonSerializer.Deserialize<AddRequest>(body);
                var result = McpTools.Add(req?.a ?? 0, req?.b ?? 0);
                responseBody = JsonSerializer.Serialize(result);
                statusCode = 200;
            }
            else if (request.Path == "/api/tools/getDateTime" && request.HttpMethod == "POST")
            {
                var req = JsonSerializer.Deserialize<GetDateTimeRequest>(body);
                var result = McpTools.GetDateTime(req?.offsetHours);
                responseBody = JsonSerializer.Serialize(result);
                statusCode = 200;
            }
            else if (request.Path == "/api/tools/analyzeText" && request.HttpMethod == "POST")
            {
                var req = JsonSerializer.Deserialize<AnalyzeTextRequest>(body);
                var result = McpTools.AnalyzeText(req?.text ?? "");
                responseBody = JsonSerializer.Serialize(result);
                statusCode = 200;
            }
            else if (request.Path == "/api/tools/getMeetingTime" && request.HttpMethod == "POST")
            {
                var req = JsonSerializer.Deserialize<GetMeetingTimeRequest>(body);
                var result = McpTools.GetMeetingTime(
                    req?.country1 ?? "", 
                    req?.country2 ?? "", 
                    req?.preferredTime, 
                    req?.meetingDate
                );
                responseBody = JsonSerializer.Serialize(result);
                statusCode = 200;
            }
            else if (request.Path == "/health" && request.HttpMethod == "GET")
            {
                responseBody = JsonSerializer.Serialize(new { status = "healthy" });
                statusCode = 200;
            }
            else
            {
                responseBody = JsonSerializer.Serialize(new { error = "Not found" });
                statusCode = 404;
            }

            return new APIGatewayProxyResponse
            {
                StatusCode = statusCode,
                Body = responseBody,
                Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } }
            };
        }
        catch (Exception ex)
        {
            context.Logger.LogLine($"Error: {ex.Message}");
            context.Logger.LogLine($"StackTrace: {ex.StackTrace}");
            return new APIGatewayProxyResponse
            {
                StatusCode = 500,
                Body = JsonSerializer.Serialize(new { error = ex.Message }),
                Headers = new Dictionary<string, string> { { "Content-Type", "application/json" } }
            };
        }
    }
}

// Request DTOs
public class EchoRequest { public string? message { get; set; } }
public class ReverseRequest { public string? text { get; set; } }
public class AddRequest { public int a { get; set; } public int b { get; set; } }
public class GetDateTimeRequest { public int? offsetHours { get; set; } }
public class AnalyzeTextRequest { public string? text { get; set; } }
public class GetMeetingTimeRequest { public string? country1 { get; set; } public string? country2 { get; set; } public string? preferredTime { get; set; } public string? meetingDate { get; set; } }
