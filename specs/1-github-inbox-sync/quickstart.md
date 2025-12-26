# Quickstart: GitHub Inbox Sync 개발 가이드

**Feature**: 1-github-inbox-sync
**Date**: 2025-12-26

---

## 개발 환경 설정

### 사전 요구사항

- Node.js 18.x 이상
- npm 9.x 이상
- Obsidian (데스크톱 버전)

### 설치

```bash
# 프로젝트 클론 (이미 생성됨)
cd obsidian-github-inbox-sync

# 의존성 설치
npm install

# 개발 모드 실행 (파일 변경 시 자동 빌드)
npm run dev
```

### 테스트용 Vault 연결

1. Obsidian에서 테스트용 Vault 생성
2. `{VaultPath}/.obsidian/plugins/github-inbox-sync/` 폴더 생성
3. 빌드된 파일 심볼릭 링크:

```bash
# macOS/Linux
ln -s $(pwd)/main.js ~/.obsidian/plugins/github-inbox-sync/main.js
ln -s $(pwd)/manifest.json ~/.obsidian/plugins/github-inbox-sync/manifest.json
ln -s $(pwd)/styles.css ~/.obsidian/plugins/github-inbox-sync/styles.css

# 또는 직접 복사
cp main.js manifest.json styles.css ~/.obsidian/plugins/github-inbox-sync/
```

4. Obsidian 설정 → Community Plugins → GitHub Inbox Sync 활성화

---

## 프로젝트 구조

```
src/
├── main.ts                 # 플러그인 진입점
├── types.ts                # TypeScript 타입 정의
├── services/
│   ├── github-service.ts   # GitHub API 통신
│   ├── sync-service.ts     # 동기화 로직
│   ├── file-service.ts     # Vault 파일 작업
│   └── state-service.ts    # 상태 관리
├── ui/
│   ├── settings-tab.ts     # 설정 화면
│   └── ribbon-icon.ts      # 리본 아이콘
└── utils/
    ├── backoff.ts          # Exponential backoff
    └── validation.ts       # 입력값 검증
```

---

## 핵심 구현 가이드

### 1. GitHub API 호출

```typescript
// src/services/github-service.ts
import { requestUrl, RequestUrlParam } from 'obsidian';

export class GitHubService {
  constructor(
    private token: string,
    private repository: string,
    private branch: string
  ) {}

  private getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  async listFiles(path: string): Promise<GitHubFile[]> {
    const [owner, repo] = this.repository.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${this.branch}`;

    const response = await requestUrl({
      url,
      headers: this.getHeaders(),
    });

    const items = response.json as GitHubContentItem[];
    return items
      .filter(item => item.type === 'file' && item.name.endsWith('.md'))
      .map(item => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        downloadUrl: item.download_url,
      }));
  }

  async downloadContent(file: GitHubFile): Promise<string> {
    const [owner, repo] = this.repository.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${this.branch}`;

    const response = await requestUrl({
      url,
      headers: {
        ...this.getHeaders(),
        'Accept': 'application/vnd.github.raw+json',
      },
    });

    return response.text;
  }
}
```

### 2. 파일 생성

```typescript
// src/services/file-service.ts
import { App, TFile, TFolder } from 'obsidian';

export class FileService {
  constructor(
    private app: App,
    private targetPath: string
  ) {}

  async ensureFolder(): Promise<void> {
    const vault = this.app.vault;
    const folder = vault.getAbstractFileByPath(this.targetPath);

    if (!folder) {
      await vault.createFolder(this.targetPath);
    }
  }

  async createFile(filename: string, content: string): Promise<string> {
    await this.ensureFolder();

    const filePath = `${this.targetPath}/${filename}`;
    const existing = this.app.vault.getAbstractFileByPath(filePath);

    if (existing instanceof TFile) {
      return filePath; // 또는 중복 처리 로직
    }

    await this.app.vault.create(filePath, content);
    return filePath;
  }
}
```

### 3. 주기적 동기화

```typescript
// src/main.ts
export default class GitHubInboxSyncPlugin extends Plugin {
  private syncIntervalId?: number;

  startAutoSync() {
    this.stopAutoSync();

    if (this.settings.autoSync) {
      const intervalMs = this.settings.syncInterval * 60 * 1000;
      this.syncIntervalId = window.setInterval(
        () => this.performSync(),
        intervalMs
      );
      this.registerInterval(this.syncIntervalId);
    }
  }

  stopAutoSync() {
    if (this.syncIntervalId) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }
}
```

### 4. 상태 관리 (SHA 추적)

```typescript
// src/services/state-service.ts
export class StateService {
  private state: SyncState;

  isAlreadySynced(sha: string): boolean {
    return sha in this.state.syncedFiles;
  }

  recordSync(file: GitHubFile, localPath: string): void {
    this.state.syncedFiles[file.sha] = {
      filename: file.name,
      path: file.path,
      syncedAt: new Date().toISOString(),
      localPath,
    };
  }

  cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    for (const [sha, record] of Object.entries(this.state.syncedFiles)) {
      if (new Date(record.syncedAt) < cutoffDate) {
        delete this.state.syncedFiles[sha];
      }
    }
  }
}
```

---

## 테스트 시나리오

### 수동 테스트 체크리스트

1. **설정 저장**
   - [ ] 토큰 입력 후 재시작 시 유지됨
   - [ ] 토큰이 마스킹되어 표시됨

2. **연결 테스트**
   - [ ] 유효한 토큰으로 성공 메시지
   - [ ] 잘못된 토큰으로 에러 메시지

3. **동기화**
   - [ ] 새 파일 다운로드됨
   - [ ] 이미 동기화된 파일 스킵됨
   - [ ] 알림 표시됨

4. **자동 동기화**
   - [ ] 설정된 간격으로 실행됨
   - [ ] 비활성화 시 중지됨

---

## 디버깅

### 개발자 콘솔

Obsidian에서 `Ctrl+Shift+I` (Windows) 또는 `Cmd+Option+I` (Mac)으로 개발자 콘솔 열기

```typescript
// 디버그 로깅 추가
console.log('[GitHub Inbox Sync]', 'Sync started');
```

### 일반적인 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| 플러그인 목록에 없음 | manifest.json 경로 오류 | 플러그인 폴더 확인 |
| 토큰 저장 안됨 | data.json 권한 | 폴더 권한 확인 |
| API 호출 실패 | CORS | requestUrl 사용 (fetch X) |

---

## 다음 단계

1. `/speckit.tasks` 실행하여 세부 구현 태스크 생성
2. 태스크별 TDD로 구현 진행
3. 통합 테스트 수행
