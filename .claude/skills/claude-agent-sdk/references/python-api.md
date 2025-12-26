# Claude Agent SDK - Python API Reference

## Table of Contents
- [query Function](#query-function)
- [ClaudeAgentOptions](#claudeagentoptions)
- [Message Types](#message-types)
- [Tools Configuration](#tools-configuration)
- [Permissions](#permissions)
- [Hooks](#hooks)
- [MCP Servers](#mcp-servers)
- [Subagents](#subagents)

## query Function

The main entry point for interacting with Claude:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="What files are in this directory?",
        options=ClaudeAgentOptions(allowed_tools=["Bash", "Glob"])
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

## ClaudeAgentOptions

```python
from claude_agent_sdk import ClaudeAgentOptions

options = ClaudeAgentOptions(
    # Model selection
    model="claude-sonnet-4-5",

    # Working directory for file operations
    working_directory="/path/to/project",

    # Custom system prompt
    system_prompt="You are a security-focused code reviewer.",

    # Permission mode
    permission_mode="default",  # "default" | "acceptEdits" | "bypassPermissions"

    # Tool configuration
    allowed_tools=["Read", "Edit", "Bash"],
    disallowed_tools=["Write"],

    # Session management
    resume="session_id_to_resume",

    # MCP servers
    mcp_servers={
        "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}
    },

    # Subagents
    agents={
        "code-reviewer": AgentDefinition(
            description="Expert code reviewer.",
            prompt="Analyze code quality.",
            tools=["Read", "Glob", "Grep"]
        )
    },

    # Budget control
    max_budget_usd=5.0,

    # Load project settings
    setting_sources=["project"],

    # Hooks
    hooks={
        "PostToolUse": [HookMatcher(matcher="Edit|Write", hooks=[log_callback])]
    }
)
```

## Message Types

### System Init Message
```python
if hasattr(message, 'subtype') and message.subtype == 'init':
    print(f"Session ID: {message.session_id}")
    if hasattr(message, 'skills'):
        print(f"Available skills: {message.skills}")
```

### Assistant Message
```python
if message.type == 'assistant':
    print(message.content)
```

### Result (Final)
```python
if hasattr(message, "result"):
    print(f"Final result: {message.result}")
```

### Error Handling
```python
if message.type == 'error':
    print(f"Error: {message.error}")
```

## Tools Configuration

### Strict Allowlist
```python
async for message in query(
    prompt="Analyze the codebase structure",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob"]
    )
):
    if hasattr(message, "result"):
        print(message.result)
```

### Read-Only Agent
```python
async for message in query(
    prompt="Review this code for best practices",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Glob", "Grep"],
        permission_mode="bypassPermissions"
    )
):
    if hasattr(message, "result"):
        print(message.result)
```

## Permissions

### Permission Modes
- `"default"`: Standard permission checks
- `"acceptEdits"`: Automatically approve file edits
- `"bypassPermissions"`: Skip all permission checks (use with caution)

### Example with acceptEdits
```python
async for message in query(
    prompt="Refactor the user service to use async/await",
    options=ClaudeAgentOptions(
        permission_mode="acceptEdits",
        working_directory="/path/to/project"
    )
):
    if hasattr(message, "result"):
        print(message.result)
```

## Hooks

### PostToolUse Hook Example
```python
from datetime import datetime
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher

async def log_file_change(input_data, tool_use_id, context):
    file_path = input_data.get('tool_input', {}).get('file_path', 'unknown')
    with open('./audit.log', 'a') as f:
        f.write(f"{datetime.now()}: modified {file_path}\n")
    return {}

async def main():
    async for message in query(
        prompt="Refactor utils.py to improve readability",
        options=ClaudeAgentOptions(
            permission_mode="acceptEdits",
            hooks={
                "PostToolUse": [HookMatcher(matcher="Edit|Write", hooks=[log_file_change])]
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

### Available Hook Points
- `PreToolUse`: Before a tool is executed
- `PostToolUse`: After a tool completes
- `Stop`: When agent stops
- `SessionStart`: When session begins
- `SessionEnd`: When session ends
- `UserPromptSubmit`: When user submits a prompt

## MCP Servers

### Connect External MCP Server
```python
async for message in query(
    prompt="Open example.com and describe what you see",
    options=ClaudeAgentOptions(
        mcp_servers={
            "playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}
        }
    )
):
    if hasattr(message, "result"):
        print(message.result)
```

## Subagents

### Define Custom Agents
```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async for message in query(
    prompt="Use the code-reviewer agent to review this codebase",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Glob", "Grep", "Task"],
        agents={
            "code-reviewer": AgentDefinition(
                description="Expert code reviewer for quality and security reviews.",
                prompt="Analyze code quality and suggest improvements.",
                tools=["Read", "Glob", "Grep"]
            )
        }
    )
):
    if hasattr(message, "result"):
        print(message.result)
```

Subagent messages include `parent_tool_use_id` for tracking which messages belong to which subagent execution.

## Session Management

### Capture and Resume Session
```python
session_id = None

# First query: capture the session ID
async for message in query(
    prompt="Read the authentication module",
    options=ClaudeAgentOptions(allowed_tools=["Read", "Glob"])
):
    if hasattr(message, 'subtype') and message.subtype == 'init':
        session_id = message.session_id

# Resume with full context from the first query
async for message in query(
    prompt="Now find all places that call it",
    options=ClaudeAgentOptions(resume=session_id)
):
    if hasattr(message, "result"):
        print(message.result)
```

## Budget Management

```python
async for message in query(
    prompt="Perform comprehensive code analysis",
    options=ClaudeAgentOptions(
        max_budget_usd=2.5  # Stop execution if cost exceeds $2.50
    )
):
    if hasattr(message, 'error') and message.error.get('type') == 'budget_exceeded':
        print('Budget limit exceeded:', message.error.get('message'))
        break
    if hasattr(message, "result"):
        print(message.result)
```

## Project Skills

### Load Skills from Project
```python
async for message in query(
    prompt="Review the pull request using available skills",
    options=ClaudeAgentOptions(
        setting_sources=["project"]  # Loads skills from .claude/commands/
    )
):
    if hasattr(message, 'subtype') and message.subtype == 'init':
        print(f"Session ID: {message.session_id}")
        if hasattr(message, 'skills') and message.skills:
            print(f"Available skills: {', '.join(message.skills)}")
    elif hasattr(message, "result"):
        print(message.result)
```

## Complete Example

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, HookMatcher

async def audit_log(input_data, tool_use_id, context):
    """Log all file modifications to audit.log"""
    file_path = input_data.get('tool_input', {}).get('file_path', 'unknown')
    with open('./audit.log', 'a') as f:
        f.write(f"Modified: {file_path}\n")
    return {}

async def main():
    session_id = None

    # First query: analyze codebase
    async for message in query(
        prompt="Analyze the authentication module for security issues",
        options=ClaudeAgentOptions(
            model="claude-sonnet-4-5",
            working_directory="/path/to/project",
            system_prompt="You are a security-focused code reviewer.",
            permission_mode="acceptEdits",
            max_budget_usd=5.0,
            allowed_tools=["Read", "Grep", "Glob", "Edit"],
            hooks={
                "PostToolUse": [HookMatcher(matcher="Edit", hooks=[audit_log])]
            }
        )
    ):
        if hasattr(message, 'subtype') and message.subtype == 'init':
            session_id = message.session_id
            print(f"Session started: {session_id}")
        elif message.type == 'assistant':
            print(f"Claude: {message.content}")
        elif hasattr(message, "result"):
            print(f"Result: {message.result}")

    # Resume session to continue analysis
    if session_id:
        async for message in query(
            prompt="Now suggest fixes for any issues found",
            options=ClaudeAgentOptions(resume=session_id)
        ):
            if hasattr(message, "result"):
                print(f"Fixes: {message.result}")

asyncio.run(main())
```

## Error Handling

```python
try:
    async for message in query(
        prompt="Analyze the codebase",
        options=ClaudeAgentOptions(max_budget_usd=1.0)
    ):
        if message.type == 'error':
            print(f"Agent error: {message.error}")
            break
        if hasattr(message, "result"):
            print(message.result)
except Exception as e:
    print(f"SDK error: {e}")
```

## Available Models

- `claude-opus-4-5-20251101` - Most capable
- `claude-sonnet-4-20250514` - Balanced (default)
- `claude-sonnet-4-5-20250929` - Latest Sonnet
- `claude-haiku-4-5-20251001` - Fastest

Specify model in options:
```python
options = ClaudeAgentOptions(model="claude-opus-4-5-20251101")
```
