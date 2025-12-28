# GitHub Inbox Sync for Obsidian

GitHub 저장소에서 Obsidian vault로 마크다운 노트를 자동으로 동기화하는 플러그인입니다.

## 사용 사례

- n8n/Zapier 워크플로우에서 생성된 노트를 Obsidian으로 자동 가져오기
- iCloud로 동기화되는 vault에 외부 자동화 연동
- RSS 피드, AI 요약 등 자동 생성 콘텐츠 수집

## 기능

- GitHub 저장소의 특정 폴더에서 마크다운 파일 동기화
- Obsidian 시작 시 자동 동기화
- 설정된 간격으로 주기적 동기화
- Command Palette 또는 Ribbon 아이콘으로 수동 동기화
- 중복 파일 처리 (스킵/덮어쓰기/이름 변경)
- 동기화 후 GitHub 파일 삭제 또는 processed 폴더로 이동
- SHA 기반 추적으로 이미 동기화된 파일 스킵

## 설치

### 수동 설치

1. 최신 릴리스에서 `main.js`, `manifest.json`, `styles.css` 다운로드
2. Vault의 `.obsidian/plugins/github-inbox-sync/` 폴더에 파일 복사
3. Obsidian 설정 > Community Plugins에서 플러그인 활성화

### BRAT을 통한 설치

1. BRAT 플러그인 설치
2. "Add Beta Plugin" 명령 실행
3. 저장소 URL 입력

## 설정

### 1. GitHub Personal Access Token 생성

1. [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) 접속
2. "Fine-grained tokens" 선택 후 새 토큰 생성
3. 필요한 권한:
   - **Repository access**: 대상 저장소만 선택
   - **Permissions**: Contents (Read and write)
4. 생성된 토큰 복사

### 2. 플러그인 설정

| 설정 | 설명 | 기본값 |
|------|------|--------|
| GitHub Personal Access Token | 생성한 토큰 | - |
| 저장소 | `owner/repo` 형식 | - |
| 브랜치 | 동기화할 브랜치 | main |
| 소스 폴더 | GitHub 내 폴더 경로 | inbox |
| 대상 폴더 | Vault 내 저장 폴더 | inbox |
| 시작 시 동기화 | Obsidian 시작 시 자동 동기화 | 켜짐 |
| 자동 동기화 | 주기적 백그라운드 동기화 | 켜짐 |
| 동기화 간격 | 자동 동기화 간격 (분) | 5 |
| 중복 파일 처리 | skip/overwrite/rename | skip |
| processed 폴더로 이동 | 동기화 후 이동 | 켜짐 |
| 동기화 후 삭제 | GitHub에서 파일 삭제 | 꺼짐 |

## 사용법

### 수동 동기화

- **Command Palette**: `GitHub Inbox Sync: Sync now`
- **Ribbon 아이콘**: 왼쪽 사이드바의 inbox 아이콘 클릭

### n8n 연동

GitHub 노드에서 `inbox/` 폴더에 파일 생성 후 커밋하면 플러그인이 자동으로 가져옵니다.

#### 웹페이지 크롤링 워크플로우

웹페이지 URL을 받아 크롤링하고, AI로 콘텐츠를 정제하여 GitHub에 마크다운으로 저장하는 워크플로우를 제공합니다.

- **워크플로우 파일**: [`examples/n8n/n8n-crawl-to-github.json`](examples/n8n/n8n-crawl-to-github.json)

**워크플로우 흐름:**

```
Webhook → Jina Reader → AI Agent → GitHub
   │          │            │          │
   │          │            │          └─ inbox/에 마크다운 저장
   │          │            └─ 콘텐츠 정제 및 제목 추출
   │          └─ 웹페이지 크롤링 (jina.ai)
   └─ POST 요청으로 URL 수신
```

**설정 방법:**

1. n8n에서 워크플로우 파일 임포트
2. Credentials 설정:
   - **OpenRouter API**: [OpenRouter](https://openrouter.ai/)에서 API 키 발급
   - **GitHub API**: Personal Access Token (Contents 권한 필요)
3. GitHub 노드에서 저장소 정보 수정:
   - `owner`: GitHub 사용자명
   - `repository`: 저장소 이름

**사용법:**

```shell
curl -X POST https://YOUR_N8N_DOMAIN/webhook/crawl-to-github \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

#### 커스텀 워크플로우 만들기

제공된 워크플로우 대신 직접 워크플로우를 구성하려면 다음과 같이 설정합니다.

**1. Code 노드에서 마크다운 생성:**

```javascript
// n8n Code 노드
const markdown = `---
created: ${new Date().toISOString()}
source: n8n
tags: [auto-generated]
---

# ${items[0].json.title}

${items[0].json.content}
`;

return [{
  json: {
    filename: items[0].json.title.replace(/[^a-zA-Z0-9가-힣\s-]/g, '').replace(/\s+/g, '-'),
    content: markdown
  }
}];
```

**2. GitHub 노드 설정:**

| 설정 | 값 |
|------|-----|
| Resource | File |
| Operation | Create |
| Repository | `owner/repo` |
| File Path | `inbox/{{ $json.filename }}.md` |
| File Content | `{{ $json.content }}` |
| Commit Message | `Add: {{ $json.filename }}` |

## 주의사항

- 동기화된 파일은 SHA로 추적됩니다. 로컬에서 삭제해도 다시 다운로드되지 않습니다.
- 동기화 기록은 90일 후 자동으로 정리됩니다.
- 동기화 기록을 초기화하면 이전에 동기화된 파일이 다시 다운로드될 수 있습니다.

## 라이선스

MIT
