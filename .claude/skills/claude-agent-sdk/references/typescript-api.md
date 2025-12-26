# Claude Agent SDK - TypeScript API Reference

## Table of Contents
- [query Function](#query-function)
- [Options](#options)
- [Message Types](#message-types)
- [Tools Configuration](#tools-configuration)
- [Permissions](#permissions)
- [Hooks](#hooks)
- [MCP Servers](#mcp-servers)
- [Subagents](#subagents)
- [Plugins](#plugins)

## query Function

The main entry point for interacting with Claude:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const response = query({
  prompt: string,
  options?: QueryOptions
});

// Iterate over streaming messages
for await (const message of response) {
  console.log(message);
}
```

## Options

```typescript
interface QueryOptions {
  // Model selection
  model?: string;  // e.g., "claude-sonnet-4-5"

  // Working directory for file operations
  workingDirectory?: string;

  // Custom system prompt
  systemPrompt?: string;

  // Permission mode
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions";

  // Custom permission callback
  canUseTool?: (toolName: string, input: any) => Promise<PermissionResult>;

  // Tool configuration
  allowedTools?: string[];
  disallowedTools?: string[];
  tools?: string[] | { type: "preset", preset: "claude_code" };

  // Session management
  resume?: string;  // Session ID to resume

  // MCP servers
  mcpServers?: Record<string, McpServerConfig>;

  // Subagents
  agents?: Record<string, AgentDefinition>;

  // Budget control
  maxBudgetUsd?: number;

  // Load project settings
  settingSources?: ("project" | "user")[];

  // Beta features
  betas?: string[];

  // Custom plugins
  plugins?: Plugin[];
}
```

## Message Types

### System Init Message
```typescript
if (message.type === 'system' && message.subtype === 'init') {
  console.log(`Session ID: ${message.session_id}`);
  console.log(`Available skills: ${message.skills?.join(', ')}`);
}
```

### Assistant Message
```typescript
if (message.type === 'assistant') {
  console.log(message.content);
}
```

### Tool Call
```typescript
if (message.type === 'tool_call') {
  console.log(`Tool: ${message.tool_name}`);
  console.log(`Input: ${JSON.stringify(message.input)}`);
}
```

### Tool Result
```typescript
if (message.type === 'tool_result') {
  console.log(`Result: ${message.result}`);
}
```

### Result (Final)
```typescript
if ("result" in message) {
  console.log(`Final result: ${message.result}`);
}
```

### Error
```typescript
if (message.type === 'error') {
  console.error('Error:', message.error);
}
```

## Tools Configuration

### Strict Allowlist
```typescript
const response = query({
  prompt: "Analyze the codebase",
  options: {
    tools: ["Read", "Grep", "Glob"]  // Only these tools available
  }
});
```

### Disable Built-in Tools
```typescript
const response = query({
  prompt: "Process data using custom tools",
  options: {
    tools: [],  // No built-in tools
    mcpServers: { "custom": myCustomServer }
  }
});
```

### Exclude Specific Tools
```typescript
const response = query({
  prompt: "Read-only analysis",
  options: {
    disallowedTools: ["Write", "Edit", "Bash"]
  }
});
```

## Permissions

### Permission Result Type
```typescript
interface PermissionResult {
  behavior: "allow" | "deny" | "ask";
  message?: string;
}
```

### Custom Permission Callback
```typescript
const response = query({
  prompt: "Deploy the application",
  options: {
    permissionMode: "default",
    canUseTool: async (toolName, input) => {
      // Allow read-only operations
      if (['Read', 'Grep', 'Glob'].includes(toolName)) {
        return { behavior: "allow" };
      }

      // Deny destructive bash commands
      if (toolName === 'Bash' && input.command.includes('rm ')) {
        return {
          behavior: "deny",
          message: "Destructive operations require manual approval"
        };
      }

      // Ask for confirmation on file writes
      if (toolName === 'Write' || toolName === 'Edit') {
        return {
          behavior: "ask",
          message: `Allow modification of ${input.file_path}?`
        };
      }

      return { behavior: "allow" };
    }
  }
});
```

## Hooks

### PostToolUse Hook Example
```typescript
import { query, HookCallback } from "@anthropic-ai/claude-agent-sdk";
import { appendFileSync } from "fs";

const logFileChange: HookCallback = async (input) => {
  const filePath = (input as any).tool_input?.file_path ?? "unknown";
  appendFileSync("./audit.log", `${new Date().toISOString()}: modified ${filePath}\n`);
  return {};
};

const response = query({
  prompt: "Refactor utils.py",
  options: {
    permissionMode: "acceptEdits",
    hooks: {
      PostToolUse: [{ matcher: "Edit|Write", hooks: [logFileChange] }]
    }
  }
});
```

### Available Hook Points
- `PreToolUse`: Before a tool is executed
- `PostToolUse`: After a tool completes
- `Stop`: When agent stops
- `SessionStart`: When session begins
- `SessionEnd`: When session ends
- `UserPromptSubmit`: When user submits a prompt

## MCP Servers

### External Command Server
```typescript
const response = query({
  prompt: "Open example.com",
  options: {
    mcpServers: {
      playwright: { command: "npx", args: ["@playwright/mcp@latest"] }
    }
  }
});
```

### Custom MCP Server with Tools
```typescript
import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const weatherServer = createSdkMcpServer({
  name: "weather-service",
  version: "1.0.0",
  tools: [
    tool(
      "get_weather",
      "Get current weather for a location",
      {
        location: z.string().describe("City name"),
        units: z.enum(["celsius", "fahrenheit"]).default("celsius")
      },
      async (args) => {
        const data = await fetchWeather(args.location, args.units);
        return {
          content: [{
            type: "text",
            text: `Temperature: ${data.temp}° ${args.units}`
          }]
        };
      }
    )
  ]
});

const response = query({
  prompt: "What's the weather in Tokyo?",
  options: {
    mcpServers: { "weather": weatherServer },
    allowedTools: ["mcp__weather__get_weather"]
  }
});
```

## Subagents

### Define Custom Agents
```typescript
const response = query({
  prompt: "Use the code-reviewer agent",
  options: {
    allowedTools: ["Read", "Glob", "Grep", "Task"],
    agents: {
      "code-reviewer": {
        description: "Expert code reviewer for quality and security reviews.",
        prompt: "Analyze code quality and suggest improvements.",
        tools: ["Read", "Glob", "Grep"]
      },
      "test-writer": {
        description: "Writes comprehensive test suites.",
        prompt: "Generate unit tests with good coverage.",
        tools: ["Read", "Write", "Bash"]
      }
    }
  }
});
```

Subagent messages include `parent_tool_use_id` for tracking.

## Plugins

### Define Custom Plugins
```typescript
const customPlugins = [
  {
    name: "analytics-tracker",
    version: "1.0.0",
    initialize: async (context) => {
      console.log("Analytics plugin initialized");
    },
    onToolCall: async (toolName, input) => {
      analytics.track("tool_call", { tool: toolName });
    },
    onMessage: async (message) => {
      if (message.type === 'assistant') {
        analytics.track("assistant_message", { length: message.content.length });
      }
    }
  },
  {
    name: "rate-limiter",
    version: "1.0.0",
    initialize: async (context) => {
      context.callCount = 0;
    },
    onToolCall: async (toolName, input, context) => {
      context.callCount++;
      if (context.callCount > 100) {
        throw new Error("Rate limit exceeded");
      }
    }
  }
];

const response = query({
  prompt: "Perform code review",
  options: { plugins: customPlugins }
});
```

## Beta Features

### Enable 1M Token Context
```typescript
const response = query({
  prompt: "Analyze this large codebase",
  options: {
    model: "claude-sonnet-4-5",
    betas: ["context-1m-2025-08-07"]
  }
});
```

## Session Management

### Capture and Resume Session
```typescript
let sessionId: string | undefined;

// First query: capture session ID
for await (const message of query({
  prompt: "Read the auth module",
  options: { allowedTools: ["Read", "Glob"] }
})) {
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id;
  }
}

// Resume with full context
for await (const message of query({
  prompt: "Now find all places that call it",
  options: { resume: sessionId }
})) {
  if ("result" in message) console.log(message.result);
}
```

## Budget Management

```typescript
const response = query({
  prompt: "Comprehensive code analysis",
  options: {
    maxBudgetUsd: 5.0  // Stop if cost exceeds $5.00
  }
});

for await (const message of response) {
  if (message.type === 'error' && message.error?.type === 'budget_exceeded') {
    console.error('Budget limit exceeded');
    break;
  }
}
```

## Complete Example

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

async function runAgent() {
  const response = query({
    prompt: "Review the authentication module for security issues",
    options: {
      model: "claude-sonnet-4-5",
      workingDirectory: "/path/to/project",
      systemPrompt: "You are a security-focused code reviewer.",
      permissionMode: "default",
      maxBudgetUsd: 5.0,
      allowedTools: ["Read", "Grep", "Glob"],
      canUseTool: async (toolName, input) => {
        if (toolName === 'Bash' && input.command.includes('rm')) {
          return { behavior: "deny", message: "Destructive commands blocked" };
        }
        return { behavior: "allow" };
      }
    }
  });

  for await (const message of response) {
    switch (message.type) {
      case 'system':
        if (message.subtype === 'init') {
          console.log(`Session: ${message.session_id}`);
        }
        break;
      case 'assistant':
        console.log('Claude:', message.content);
        break;
      case 'tool_call':
        console.log(`Tool: ${message.tool_name}`);
        break;
      case 'error':
        console.error('Error:', message.error);
        break;
    }
  }
}

runAgent();
```
