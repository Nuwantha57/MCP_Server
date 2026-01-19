@echo off
REM Wrapper to launch bridge with environment variables from system

REM Get environment variables from user environment
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v AWS_ACCESS_KEY_ID 2^>nul') do set AWS_ACCESS_KEY_ID=%%b
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v AWS_SECRET_ACCESS_KEY 2^>nul') do set AWS_SECRET_ACCESS_KEY=%%b
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v AWS_REGION 2^>nul') do set AWS_REGION=%%b

REM Launch bridge
node "c:\MCP_Server\bridge.js"
