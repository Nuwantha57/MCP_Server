using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace MCP.Server.Tests
{
    public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public ApiTests(WebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Health_ReturnsOk()
        {
            var response = await _client.GetAsync("/health");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        [Fact]
        public async Task Execute_EchoTool_ReturnsSuccess()
        {
            var payload = new { tool = "echo", input = new { foo = "bar" } };
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);
            
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(result.GetProperty("success").GetBoolean());
        }

        [Fact]
        public async Task Execute_ReverseTool_ReturnsReversedText()
        {
            var payload = new { tool = "reverse", input = new { text = "hello" } };
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);
            
            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            var reversed = result.GetProperty("result").GetProperty("result").GetString();
            Assert.Equal("olleh", reversed);
        }

        [Fact]
        public async Task Execute_MissingTool_ReturnsBadRequest()
        {
            var payload = new { tool = "", input = new { } };
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Execute_UnknownTool_ReturnsBadRequest()
        {
            var payload = new { tool = "unknown", input = new { } };
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Execute_ReverseWithoutText_ReturnsValidationError()
        {
            var payload = new { tool = "reverse", input = new { } };
            var response = await _client.PostAsJsonAsync("/mcp/execute", payload);
            
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
