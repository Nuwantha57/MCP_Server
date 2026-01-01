# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/MCP.Server ./src/MCP.Server
RUN dotnet restore src/MCP.Server/MCP.Server.csproj
RUN dotnet publish src/MCP.Server/MCP.Server.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Production configuration - Railway handles TLS
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "MCP.Server.dll"]
