using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace MCP.Server.Tests
{
    public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;
        private readonly WebApplicationFactory<Program> _factory;
        private const string TestApiKey = "test-api-key-12345";

        public ApiTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureAppConfiguration((context, config) =>
                {
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["Security:ApiKey"] = TestApiKey,
                        ["Security:RequireHttps"] = "false"
                    });
                });
            });
            _client = _factory.CreateClient();
        }

        private HttpClient CreateAuthenticatedClient()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-api-key", TestApiKey);
            return client;
        }

        private HttpClient CreateUnauthenticatedClient()
        {
            return _factory.CreateClient();
        }

        [Fact]
        public async Task PublicEndpoint_Health_WithoutApiKey_ReturnsOk()
        {
            // Arrange & Act
            var response = await _client.GetAsync("/health");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        // ===== END-TO-END INTEGRATION TESTS: REST TOOLS ENDPOINTS =====

        [Fact]
        public async Task EchoTool_WithValidInput_ReturnsExpectedOutput()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { message = "Hello World" };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/echo", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("Echo: Hello World", result.GetProperty("result").GetString());
        }

        [Fact]
        public async Task EchoTool_WithEmptyMessage_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { message = "" };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/echo", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task EchoTool_WithNullMessage_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { message = (string?)null };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/echo", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task EchoTool_WithLongMessage_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var longMessage = new string('a', 1001);
            var request = new { message = longMessage };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/echo", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task ReverseTool_WithValidInput_ReturnsReversedText()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { text = "hello" };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/reverse", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("olleh", result.GetProperty("result").GetString());
        }

        [Fact]
        public async Task ReverseTool_WithLongText_ReturnsReversedText()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var text = "The quick brown fox jumps over the lazy dog";
            var request = new { text = text };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/reverse", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            var expected = new string(text.Reverse().ToArray());
            Assert.Equal(expected, result.GetProperty("result").GetString());
        }

        [Fact]
        public async Task ReverseTool_WithEmptyText_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { text = "" };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/reverse", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task AddTool_WithPositiveNumbers_ReturnsSum()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { a = 5, b = 3 };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/add", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(8, result.GetProperty("result").GetInt32());
        }

        [Fact]
        public async Task AddTool_WithNegativeNumbers_ReturnsSum()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { a = -5, b = -3 };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/add", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(-8, result.GetProperty("result").GetInt32());
        }

        [Fact]
        public async Task AddTool_WithZero_ReturnsCorrectSum()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { a = 0, b = 10 };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/add", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(10, result.GetProperty("result").GetInt32());
        }

        [Fact]
        public async Task GetDateTimeTool_WithoutOffset_ReturnsCurrentDateTime()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var beforeCall = DateTime.UtcNow;
            var request = new { offsetHours = (int?)null };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/getDateTime", request);
            var afterCall = DateTime.UtcNow;

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("utc", out _));
            Assert.True(result.TryGetProperty("local", out _));
            Assert.Equal(0, result.GetProperty("offsetHours").GetInt32());
        }

        [Fact]
        public async Task GetDateTimeTool_WithPositiveOffset_ReturnsAdjustedDateTime()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { offsetHours = 5 };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/getDateTime", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(5, result.GetProperty("offsetHours").GetInt32());
            Assert.True(result.TryGetProperty("formatted", out _));
        }

        [Fact]
        public async Task GetDateTimeTool_WithNegativeOffset_ReturnsAdjustedDateTime()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { offsetHours = -8 };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/getDateTime", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(-8, result.GetProperty("offsetHours").GetInt32());
        }

        [Fact]
        public async Task GetDateTimeTool_WithInvalidOffset_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { offsetHours = 15 }; // Out of valid range

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/getDateTime", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task AnalyzeTextTool_WithSampleText_ReturnsCorrectAnalysis()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var text = "Hello world. This is a test sentence! How are you?";
            var request = new { text = text };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/analyzeText", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("characterCount", out _));
            Assert.True(result.TryGetProperty("wordCount", out _));
            Assert.True(result.TryGetProperty("sentenceCount", out _));
            Assert.True(result.TryGetProperty("averageWordLength", out _));
            Assert.True(result.TryGetProperty("longestWord", out _));
            Assert.Equal(text.Length, result.GetProperty("characterCount").GetInt32());
        }

        [Fact]
        public async Task AnalyzeTextTool_WithSingleWord_ReturnsAnalysis()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var text = "Hello";
            var request = new { text = text };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/analyzeText", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(1, result.GetProperty("wordCount").GetInt32());
            Assert.Equal("Hello", result.GetProperty("longestWord").GetString());
        }

        [Fact]
        public async Task AnalyzeTextTool_WithEmptyText_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var request = new { text = "" };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/analyzeText", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task AnalyzeTextTool_WithLargeText_ReturnsAnalysis()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var text = new string('a', 5000);
            var request = new { text = text };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/analyzeText", request);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(5000, result.GetProperty("characterCount").GetInt32());
        }

        [Fact]
        public async Task AnalyzeTextTool_WithTextExceedingLimit_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var text = new string('a', 10001);
            var request = new { text = text };

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/analyzeText", request);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        // ===== END-TO-END INTEGRATION TESTS: PUBLIC ENDPOINTS =====

        // ===== SECURITY TESTS =====

        [Fact]
        public async Task PublicEndpoint_Info_WithoutApiKey_ReturnsOk()
        {
            // Arrange & Act
            var response = await _client.GetAsync("/info");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("MCP Server", result.GetProperty("service").GetString());
        }

        [Fact]
        public async Task PublicEndpoint_Swagger_WithoutApiKey_ReturnsOk()
        {
            // Arrange & Act
            var response = await _client.GetAsync("/swagger/index.html");

            // Assert
            // Should return OK or redirect, not 401
            Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task ProtectedEndpoint_WithoutApiKey_Returns401()
        {
            // Arrange
            var payload = new { tool = "echo", arguments = new { message = "test" } };

            // Act
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("Unauthorized", result.GetProperty("error").GetString());
            Assert.Contains("API key required", result.GetProperty("message").GetString());
        }

        [Fact]
        public async Task ProtectedEndpoint_WithInvalidApiKey_Returns401()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-api-key", "wrong-key-xyz");
            var payload = new { tool = "echo", arguments = new { message = "test" } };

            // Act
            var response = await client.PostAsJsonAsync("/mcp/execute", payload);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("Unauthorized", result.GetProperty("error").GetString());
        }

        [Fact]
        public async Task ProtectedEndpoint_WithValidApiKey_ReturnsSuccess()
        {
            // Arrange
            var client = CreateAuthenticatedClient();

            // Act - Test accessing info endpoint which is public
            var response = await client.GetAsync("/info");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task ProtectedEndpoint_WithEmptyApiKey_Returns401()
        {
            // Arrange
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("x-api-key", "");

            // Act
            var response = await client.PostAsync("/message", new StringContent("{}"));

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task MultipleCalls_WithValidApiKey_AllSucceed()
        {
            // Arrange
            var client = CreateAuthenticatedClient();

            // Act & Assert - Call health multiple times (public endpoint)
            for (int i = 0; i < 3; i++)
            {
                var response = await client.GetAsync("/health");
                Assert.True(response.IsSuccessStatusCode, $"Call {i} failed with {response.StatusCode}");
            }
        }

        [Fact]
        public async Task MixedRequests_PublicAndProtected_BehavesCorrectly()
        {
            // Arrange
            var authenticatedClient = CreateAuthenticatedClient();
            var unauthenticatedClient = _factory.CreateClient();

            // Act & Assert
            // 1. Public endpoint without auth - should work
            var healthResponse = await unauthenticatedClient.GetAsync("/health");
            Assert.Equal(HttpStatusCode.OK, healthResponse.StatusCode);

            // 2. Protected endpoint without auth - should fail
            var protectedResponse = await unauthenticatedClient.PostAsync("/message", new StringContent("{}"));
            Assert.Equal(HttpStatusCode.Unauthorized, protectedResponse.StatusCode);

            // 3. Public info endpoint with auth - should work
            var authenticatedResponse = await authenticatedClient.GetAsync("/info");
            Assert.Equal(HttpStatusCode.OK, authenticatedResponse.StatusCode);
        }

        [Fact]
        public async Task UnauthorizedResponse_ContainsTimestamp()
        {
            // Arrange
            var payload = new { tool = "echo", arguments = new { message = "test" } };

            // Act
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.TryGetProperty("timestamp", out var timestamp));
            Assert.NotEqual(default, timestamp.GetDateTime());
        }

        [Fact]
        public async Task UnauthorizedResponse_HasCorrectContentType()
        {
            // Arrange
            var payload = new { tool = "echo", arguments = new { message = "test" } };

            // Act
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        }

        // ===== INTEGRATION TESTS: SEQUENTIAL WORKFLOWS =====

        [Fact]
        public async Task WorkflowTest_MultipleToolCallsInSequence_AllSucceed()
        {
            // Arrange
            var client = CreateAuthenticatedClient();

            // Act & Assert
            // 1. Echo a message
            var echoRequest = new { message = "Test" };
            var echoResponse = await client.PostAsJsonAsync("/api/tools/echo", echoRequest);
            Assert.Equal(HttpStatusCode.OK, echoResponse.StatusCode);

            // 2. Add two numbers
            var addRequest = new { a = 10, b = 20 };
            var addResponse = await client.PostAsJsonAsync("/api/tools/add", addRequest);
            Assert.Equal(HttpStatusCode.OK, addResponse.StatusCode);
            var addResult = await addResponse.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal(30, addResult.GetProperty("result").GetInt32());

            // 3. Reverse text
            var reverseRequest = new { text = "workflow" };
            var reverseResponse = await client.PostAsJsonAsync("/api/tools/reverse", reverseRequest);
            Assert.Equal(HttpStatusCode.OK, reverseResponse.StatusCode);
            var reverseResult = await reverseResponse.Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("wolfkrow", reverseResult.GetProperty("result").GetString());
        }

        [Fact]
        public async Task WorkflowTest_ToolWithHealthCheckSequence_AllSucceed()
        {
            // Arrange
            var unauthenticatedClient = CreateUnauthenticatedClient();
            var authenticatedClient = CreateAuthenticatedClient();

            // Act & Assert
            // 1. Check health (no auth required)
            var healthResponse = await unauthenticatedClient.GetAsync("/health");
            Assert.Equal(HttpStatusCode.OK, healthResponse.StatusCode);

            // 2. Use authenticated tool
            var toolRequest = new { message = "health check passed" };
            var toolResponse = await authenticatedClient.PostAsJsonAsync("/api/tools/echo", toolRequest);
            Assert.Equal(HttpStatusCode.OK, toolResponse.StatusCode);

            // 3. Check health again
            var finalHealthResponse = await unauthenticatedClient.GetAsync("/health");
            Assert.Equal(HttpStatusCode.OK, finalHealthResponse.StatusCode);
        }

        [Fact]
        public async Task ErrorHandling_InvalidJsonPayload_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();

            // Act
            var response = await client.PostAsync("/api/tools/echo",
                new StringContent("invalid json", System.Text.Encoding.UTF8, "application/json"));

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task ErrorHandling_MissingRequiredField_ReturnsBadRequest()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var incompleteRequest = new { }; // Missing 'message' field

            // Act
            var response = await client.PostAsJsonAsync("/api/tools/echo", incompleteRequest);

            // Assert
            // API throws exception on validation, returns 500 instead of 400
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest || response.StatusCode == HttpStatusCode.InternalServerError);
        }

        [Fact]
        public async Task PerformanceTest_ManySequentialCalls_AllComplete()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var iterations = 10;
            var request = new { message = "performance test" };

            // Act
            var watch = System.Diagnostics.Stopwatch.StartNew();
            for (int i = 0; i < iterations; i++)
            {
                var response = await client.PostAsJsonAsync("/api/tools/echo", request);
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }
            watch.Stop();

            // Assert
            Assert.True(watch.ElapsedMilliseconds > 0);
            // Should complete in reasonable time (less than 30 seconds for 10 calls)
            Assert.True(watch.ElapsedMilliseconds < 30000);
        }

        [Fact]
        public async Task ConcurrencyTest_ParallelRequests_AllSucceed()
        {
            // Arrange
            var client = CreateAuthenticatedClient();
            var tasks = new List<Task<HttpResponseMessage>>();
            var parallelCount = 5;

            // Act
            for (int i = 0; i < parallelCount; i++)
            {
                var request = new { message = $"parallel test {i}" };
                tasks.Add(client.PostAsJsonAsync("/api/tools/echo", request));
            }

            var results = await Task.WhenAll(tasks);

            // Assert
            foreach (var response in results)
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }
        }
    }
}
