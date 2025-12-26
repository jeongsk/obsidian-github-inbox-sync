# README.md 필수 섹션 템플릿

Obsidian 개발자 정책 준수를 위해 README.md에 추가해야 하는 섹션들.

---

## 전체 템플릿

```markdown
## Privacy & Data Handling

### Remote Services
This plugin uses **[서비스명]** to process your requests. When you send a message:
- Your prompt text is sent to [서비스 제공자] servers
- [추가 전송 데이터 설명]
- Data is processed according to [서비스 제공자's Privacy Policy](링크)

### Account Requirements
- **[서비스명] Account/API Key**: Required for [기능 설명]
  - Get one at [가입 링크](URL)
  - Stored locally in your vault's plugin data (not encrypted)

### File System Access
This plugin accesses locations outside your Obsidian vault:
- **[접근 이유]**: [접근하는 경로 목록]
  - macOS/Linux: `경로1`, `경로2`
  - Windows: `경로1`, `경로2`
- **[추가 권한]**: [권한 설명]

### Local Data Storage
- [데이터 항목]: [저장 방식 설명]
- Settings stored in `.obsidian/plugins/[플러그인명]/data.json`
- [추가 저장 데이터 설명]
```

---

## 섹션별 예시

### Remote Services (원격 서비스)

Claude API 사용 예시:
```markdown
### Remote Services
This plugin uses the **Anthropic Claude API** to process your requests. When you send a message:
- Your prompt text is sent to Anthropic's servers
- If "Current page" context is enabled, file contents are also sent
- Data is processed according to [Anthropic's Privacy Policy](https://www.anthropic.com/privacy)
```

OpenAI API 사용 예시:
```markdown
### Remote Services
This plugin uses the **OpenAI API** to generate responses. When you use the plugin:
- Your text is sent to OpenAI's servers for processing
- Responses are streamed back to your Obsidian vault
- See [OpenAI's Privacy Policy](https://openai.com/privacy) for data handling details
```

### Account Requirements (계정 필요성)

API 키 필요 예시:
```markdown
### Account Requirements
- **API Key**: Required for AI functionality
  - Get one at [console.anthropic.com](https://console.anthropic.com)
  - Stored locally in your vault's plugin data
  - Note: API keys are stored unencrypted in `data.json`
```

유료 서비스 예시:
```markdown
### Account Requirements
- **Subscription**: Premium features require a paid subscription
  - Free tier: Basic functionality
  - Pro tier ($X/month): Advanced features
  - Sign up at [service.com](https://service.com)
```

### File System Access (파일 시스템 접근)

CLI 도구 탐색 예시:
```markdown
### File System Access
This plugin accesses locations outside your Obsidian vault:
- **CLI detection**: Searches system paths to locate the executable
  - macOS/Linux: `~/.local/bin/`, `/usr/local/bin/`, `/opt/homebrew/bin/`
  - Windows: `%USERPROFILE%\AppData\`, `C:\Program Files\`
```

고위험 권한 예시:
```markdown
### File System Access
> **Warning**: This plugin uses elevated permissions (`bypassPermissions`)

- The AI agent can read and modify files in your vault
- Back up your vault before use
- Fine-grained permission controls are planned for future releases
```

### Local Data Storage (로컬 데이터 저장)

일반 예시:
```markdown
### Local Data Storage
- Chat messages: Stored in memory only (cleared on restart)
- Settings: Stored in `.obsidian/plugins/plugin-name/data.json`
- Conversations: Can be manually saved to your vault as markdown files
```

캐시 사용 예시:
```markdown
### Local Data Storage
- Cache: Stored in `.obsidian/plugins/plugin-name/cache/`
- Cache is automatically cleared after 7 days
- You can manually clear cache in plugin settings
```

---

## Prerequisites 섹션 업데이트

API 키 필요시 Prerequisites에도 추가:

```markdown
### Prerequisites
- **[서비스명] Account** - Required for API access ([링크](URL))
- **Node.js** - Required for plugin execution
- **[추가 요구사항]** - [설명]
```

예시:
```markdown
### Prerequisites
- **Anthropic Account** - Required for Claude API access ([console.anthropic.com](https://console.anthropic.com))
- **Node.js** - Required for plugin execution
- **Claude Code CLI** - Get it from [Anthropic's Claude Code](https://www.anthropic.com/claude-code)
```
