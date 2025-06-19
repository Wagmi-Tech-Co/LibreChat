# Model Context Protocol (MCP) Implementation Guide for LibreChat

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [MCP Configuration](#mcp-configuration)
4. [Transport Types](#transport-types)
5. [Environment Variables](#environment-variables)
6. [Configuration Examples](#configuration-examples)
7. [Admin Controls](#admin-controls)
8. [Troubleshooting](#troubleshooting)
9. [Available MCP Servers](#available-mcp-servers)


## Introduction

Model Context Protocol (MCP) is an open standard that enables AI applications to securely access external data sources and tools. LibreChat supports MCP through various transport methods including stdio, WebSocket, SSE (Server-Sent Events), and streamable HTTP.

MCP in LibreChat allows you to:
- Connect to external services and APIs
- Access file systems
- Integrate with databases
- Use custom tools and functions
- Extend model capabilities with real-time data

> **📚 For more detailed information, see the official LibreChat documentation:**  
> https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/mcp_servers

## Prerequisites

Before setting up MCP in LibreChat, ensure you have:

1. **LibreChat properly installed** with the latest version that supports MCP
2. **Environment variables configured** in your `.env` file:
   ```bash
   # Enable shared MCP connections (no Docker containers)
   MCP_SHARED_CONNECTIONS=true
   
   # MCP Admin Control - if true, MCP servers only visible to admins
   MCP_JUST_ADMIN=false
   ```

3. **Docker installed** (if using Docker-based MCP servers)
4. **Node.js and npm** (if using npm-based MCP servers)

## MCP Configuration

MCP servers are configured in the `librechat.yaml` file under the `mcpServers` section. Each server requires a unique name and transport configuration.

### Basic Structure

```yaml
mcpServers:
  server-name:
    type: stdio|websocket|sse|streamable-http  # Optional, inferred from other properties
    # Transport-specific configuration
    timeout: 60000        # Optional, default timeout in milliseconds
    initTimeout: 30000    # Optional, initialization timeout in milliseconds
    chatMenu: true        # Optional, show in chat dropdown menu (default: true)
    iconPath: "/path/to/icon.svg"  # Optional, custom icon path
```

## Transport Types

### 1. Stdio Transport

Best for local command-line MCP servers.

```yaml
mcpServers:
  filesystem:
    type: stdio  # Optional
    command: npx
    args:
      - -y
      - "@modelcontextprotocol/server-filesystem"
      - "/path/to/directory"
    env:
      API_KEY: "${YOUR_API_KEY}"
      CUSTOM_VAR: "value"
    timeout: 60000
```

#### Properties:
- **`command`**: Executable to run (required)
- **`args`**: Array of command line arguments (required)
- **`env`**: Environment variables for the process (optional)

### 2. WebSocket Transport

For WebSocket-based MCP servers.

```yaml
mcpServers:
  websocket-server:
    type: websocket  # Optional
    url: "ws://localhost:8080/mcp"
    timeout: 60000
```

#### Properties:
- **`url`**: WebSocket URL starting with `ws://` or `wss://` (required)

### 3. Server-Sent Events (SSE) Transport

For HTTP-based streaming connections.

```yaml
mcpServers:
  sse-server:
    type: sse  # Optional
    url: "http://localhost:3001/sse"
    headers:
      Authorization: "Bearer ${API_TOKEN}"
      User-Agent: "LibreChat-MCP"
    timeout: 60000
```

#### Properties:
- **`url`**: HTTP/HTTPS URL for the SSE endpoint (required)
- **`headers`**: HTTP headers to include (optional)

### 4. Streamable HTTP Transport

For HTTP-based request/response communication.

```yaml
mcpServers:
  http-server:
    type: streamable-http  # Optional
    url: "https://api.example.com/mcp"
    headers:
      Authorization: "Bearer ${API_TOKEN}"
      Content-Type: "application/json"
      User-Id: "{{LIBRECHAT_USER_ID}}"
    timeout: 60000
```

#### Properties:
- **`url`**: HTTP/HTTPS URL (required, cannot be WebSocket URL)
- **`headers`**: HTTP headers to include (optional)

## Environment Variables

### Environment Variable Substitution

LibreChat supports environment variable substitution in MCP configurations:

```yaml
mcpServers:
  github:
    command: docker
    args:
      - run
      - -i
      - --rm
      - -e
      - GITHUB_PERSONAL_ACCESS_TOKEN
      - ghcr.io/github/github-mcp-server
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
```

### Special Variables

- **`{{LIBRECHAT_USER_ID}}`**: Automatically replaced with the current user's ID
- **`${ENV_VAR_NAME}`**: Replaced with the value of the environment variable

### Global MCP Settings

Add these to your `.env` file:

```bash
# Enable shared MCP connections (recommended)
MCP_SHARED_CONNECTIONS=true

# Restrict MCP to admins only (optional)
MCP_JUST_ADMIN=false

# Default timeout for MCP connections (optional)
MCP_DEFAULT_TIMEOUT=60000
```

## Configuration Examples

### Example 1: File System Access

```yaml
mcpServers:
  filesystem:
    command: npx
    args:
      - -y
      - "@modelcontextprotocol/server-filesystem"
      - "/home/user/documents"
    timeout: 60000
    iconPath: "/path/to/folder-icon.svg"
```

### Example 2: GitHub Integration

```yaml
mcpServers:
  github:
    command: docker
    args:
      - run
      - -i
      - --rm
      - -e
      - GITHUB_PERSONAL_ACCESS_TOKEN
      - ghcr.io/github/github-mcp-server
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}"
    timeout: 120000
```

### Example 3: Atlassian Integration

```yaml
mcpServers:
  atlassian:
    command: docker
    args:
      - run
      - -i
      - --rm
      - -e
      - CONFLUENCE_URL
      - -e
      - CONFLUENCE_USERNAME
      - -e
      - CONFLUENCE_API_TOKEN
      - -e
      - JIRA_URL
      - -e
      - JIRA_USERNAME
      - -e
      - JIRA_API_TOKEN
      - ghcr.io/sooperset/mcp-atlassian:latest
    env:
      CONFLUENCE_URL: "https://your-domain.atlassian.net/wiki"
      CONFLUENCE_USERNAME: "your-email@domain.com"
      CONFLUENCE_API_TOKEN: "${CONFLUENCE_API_TOKEN}"
      JIRA_URL: "https://your-domain.atlassian.net"
      JIRA_USERNAME: "your-email@domain.com"
      JIRA_API_TOKEN: "${JIRA_API_TOKEN}"
```

### Example 4: Database Connection

```yaml
mcpServers:
  postgres:
    command: npx
    args:
      - -y
      - "@modelcontextprotocol/server-postgres"
    env:
      DATABASE_URL: "${DATABASE_URL}"
    timeout: 90000
```

### Example 5: Web Browser Automation

```yaml
mcpServers:
  puppeteer:
    command: npx
    args:
      - -y
      - "@modelcontextprotocol/server-puppeteer"
    timeout: 300000  # 5 minutes for browser operations
```

### Example 6: Custom SSE Server

```yaml
mcpServers:
  custom-api:
    type: sse
    url: "https://your-api.com/mcp/sse"
    headers:
      Authorization: "Bearer ${API_TOKEN}"
      User-Agent: "LibreChat/1.0"
      User-Id: "{{LIBRECHAT_USER_ID}}"
    timeout: 60000
```

## Admin Controls

### Restricting MCP to Admins

To limit MCP functionality to admin users only:

1. **Set environment variable:**
   ```bash
   MCP_JUST_ADMIN=true
   ```

2. **Restart LibreChat** for changes to take effect.

When `MCP_JUST_ADMIN=true`:
- Only users with admin role can see MCP servers in the chat interface
- Non-admin users won't have access to MCP tools
- MCP servers still initialize at the application level

### Per-Server Chat Menu Control

Control which servers appear in the chat dropdown menu:

```yaml
mcpServers:
  internal-tools:
    command: npx
    args: ["-y", "@my/internal-server"]
    chatMenu: false  # Hide from chat menu but still available for tools
  
  public-tools:
    command: npx
    args: ["-y", "@my/public-server"]
    chatMenu: true   # Show in chat menu (default)
```

## Troubleshooting

### Common Issues

#### 1. Connection Timeouts

**Problem**: MCP server fails to connect within timeout period.

**Solution**:
```yaml
mcpServers:
  slow-server:
    command: your-command
    args: [...]
    timeout: 120000      # Increase to 2 minutes
    initTimeout: 60000   # Increase initialization timeout
```

#### 2. Environment Variables Not Working

**Problem**: Environment variables not being substituted.

**Solution**:
- Ensure variables are defined in `.env` file
- Use correct syntax: `${VAR_NAME}` for env vars, `{{LIBRECHAT_USER_ID}}` for user ID
- Check that variables are not commented out

#### 3. Docker Permission Issues

**Problem**: Docker-based MCP servers fail with permission errors.

**Solution**:
```yaml
mcpServers:
  docker-server:
    command: docker
    args:
      - run
      - -i
      - --rm
      - --user
      - "1000:1000"  # Add user/group IDs
      - your-image
```

#### 4. Server Not Appearing in Chat Menu

**Problem**: MCP server configured but not visible in interface.

**Checks**:
1. Verify `chatMenu: true` (default) in configuration
2. Check if `MCP_JUST_ADMIN=true` and user is not admin
3. Ensure server is successfully connecting (check logs)
4. Restart LibreChat after configuration changes

### Debug Mode

Enable debug logging for MCP:

```bash
DEBUG_LOGGING=true
DEBUG_CONSOLE=true
```

Check LibreChat logs for MCP-related messages:
```bash
# Look for MCP initialization messages
grep -i "mcp" logs/debug-*.log

# Check for connection errors
grep -i "error.*mcp" logs/error-*.log
```

### Connection States

MCP connections can be in various states:
- **`disconnected`**: Initial state or after disconnection
- **`connecting`**: Connection attempt in progress
- **`connected`**: Successfully connected and ready
- **`error`**: Connection failed or encountered an error

## Available MCP Servers

### Official MCP Servers

| Server | Purpose | Installation |
|--------|---------|-------------|
| `@modelcontextprotocol/server-filesystem` | File system access | `npx -y @modelcontextprotocol/server-filesystem` |
| `@modelcontextprotocol/server-git` | Git repository operations | `npx -y @modelcontextprotocol/server-git` |
| `@modelcontextprotocol/server-postgres` | PostgreSQL database access | `npx -y @modelcontextprotocol/server-postgres` |
| `@modelcontextprotocol/server-sqlite` | SQLite database access | `npx -y @modelcontextprotocol/server-sqlite` |
| `@modelcontextprotocol/server-puppeteer` | Web browser automation | `npx -y @modelcontextprotocol/server-puppeteer` |
| `@modelcontextprotocol/server-everything` | Demo server with various tools | `npx -y @modelcontextprotocol/server-everything` |

### Third-Party MCP Servers

| Server | Purpose | Repository |
|--------|---------|------------|
| GitHub MCP Server | GitHub API integration | `ghcr.io/github/github-mcp-server` |
| Atlassian MCP Server | Jira/Confluence integration | `ghcr.io/sooperset/mcp-atlassian:latest` |
| Obsidian MCP Server | Obsidian vault access | `npm install -g mcp-obsidian` |
