import json
import subprocess

env_vars = {
    "HOLIDAYS_UK": "[{\\\"start\\\": \\\"2026-12-25T00:00+00:00\\\", \\\"end\\\": \\\"2026-12-28T23:59+00:00\\\"}]",
    "HOLIDAYS_US": "[{\\\"start\\\": \\\"2026-12-25T00:00-05:00\\\", \\\"end\\\": \\\"2026-12-26T23:59-05:00\\\"}]",
    "HOLIDAYS_INDIA": "[{\\\"start\\\": \\\"2026-01-26T00:00+05:30\\\", \\\"end\\\": \\\"2026-01-26T23:59+05:30\\\"}, {\\\"start\\\": \\\"2026-03-08T00:00+05:30\\\", \\\"end\\\": \\\"2026-03-08T23:59+05:30\\\"}]",
    "HOLIDAYS_AUSTRALIA": "[{\\\"start\\\": \\\"2026-01-26T00:00+10:00\\\", \\\"end\\\": \\\"2026-01-26T23:59+10:00\\\"}]",
    "HOLIDAYS_JAPAN": "[{\\\"start\\\": \\\"2026-01-12T00:00+09:00\\\", \\\"end\\\": \\\"2026-01-12T23:59+09:00\\\"}]",
    "HOLIDAYS_GERMANY": "[{\\\"start\\\": \\\"2026-12-25T00:00+01:00\\\", \\\"end\\\": \\\"2026-12-26T23:59+01:00\\\"}]",
    "HOLIDAYS_FRANCE": "[{\\\"start\\\": \\\"2026-12-25T00:00+01:00\\\", \\\"end\\\": \\\"2026-12-25T23:59+01:00\\\"}]",
    "HOLIDAYS_SINGAPORE": "[{\\\"start\\\": \\\"2026-01-29T00:00+08:00\\\", \\\"end\\\": \\\"2026-02-01T23:59+08:00\\\"}]",
    "HOLIDAYS_BRAZIL": "[{\\\"start\\\": \\\"2026-12-25T00:00-03:00\\\", \\\"end\\\": \\\"2026-12-25T23:59-03:00\\\"}]",
    "HOLIDAYS_NZ": "[{\\\"start\\\": \\\"2026-01-02T00:00+13:00\\\", \\\"end\\\": \\\"2026-01-02T23:59+13:00\\\"}]"
}

# Format as Variables={key1=value1,key2=value2,...}
vars_str = ','.join([f'{k}={v}' for k, v in env_vars.items()])
result = subprocess.run(
    ['aws', 'lambda', 'update-function-configuration', '--function-name', 'mcp-server-function', 
     '--environment', f'Variables={{{vars_str}}}', '--region', 'eu-north-1'],
    capture_output=True, text=True
)
print(result.stdout)
if result.stderr:
    print("Error:", result.stderr)
