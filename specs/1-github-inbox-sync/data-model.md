# Data Model: GitHub Inbox Sync

**Feature**: 1-github-inbox-sync
**Date**: 2025-12-26

---

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│     GitHubInboxSyncSettings     │
├─────────────────────────────────┤
│ githubToken: string             │
│ repository: string              │
│ branch: string                  │
│ sourcePath: string              │
│ targetPath: string              │
│ syncOnStartup: boolean          │
│ autoSync: boolean               │
│ syncInterval: number            │
│ duplicateHandling: enum         │
│ deleteAfterSync: boolean        │
│ moveToProcessed: boolean        │
│ showNotifications: boolean      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│           SyncState             │
├─────────────────────────────────┤
│ lastSyncTime: string            │
│ syncedFiles: Map<sha, Record>   │───┐
│ syncHistory: SyncRecord[]       │   │
└─────────────────────────────────┘   │
                                      │
┌─────────────────────────────────┐   │
│       SyncedFileRecord          │◄──┘
├─────────────────────────────────┤
│ filename: string                │
│ path: string                    │
│ syncedAt: string                │
│ localPath: string               │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│          SyncRecord             │
├─────────────────────────────────┤
│ timestamp: string               │
│ filesAdded: number              │
│ filesSkipped: number            │
│ errors: string[]                │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│          GitHubFile             │  (Runtime only, not persisted)
├─────────────────────────────────┤
│ name: string                    │
│ path: string                    │
│ sha: string                     │
│ size: number                    │
│ downloadUrl: string             │
│ content?: string                │
└─────────────────────────────────┘
```

---

## Entity Definitions

### GitHubInboxSyncSettings

플러그인 사용자 설정. Obsidian의 `data.json`에 저장됨.

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| githubToken | string | `""` | 비어있지 않음, `ghp_` 또는 `github_pat_` 접두사 | GitHub PAT |
| repository | string | `""` | `owner/repo` 형식 | 대상 저장소 |
| branch | string | `"main"` | 비어있지 않음 | 동기화 브랜치 |
| sourcePath | string | `"inbox"` | 슬래시로 시작하지 않음 | GitHub 소스 폴더 |
| targetPath | string | `"inbox"` | 슬래시로 시작하지 않음 | Vault 대상 폴더 |
| syncOnStartup | boolean | `true` | - | 시작 시 동기화 |
| autoSync | boolean | `true` | - | 주기적 동기화 활성화 |
| syncInterval | number | `5` | 1-60 범위 | 동기화 간격(분) |
| duplicateHandling | `'skip'` \| `'overwrite'` \| `'rename'` | `"skip"` | enum 값 | 중복 처리 방식 |
| deleteAfterSync | boolean | `false` | - | 동기화 후 GitHub에서 삭제 |
| moveToProcessed | boolean | `true` | - | processed/ 폴더로 이동 |
| showNotifications | boolean | `true` | - | 알림 표시 여부 |

### SyncState

동기화 상태 추적. 별도 파일 또는 `data.json` 내 저장.

| Field | Type | Description |
|-------|------|-------------|
| lastSyncTime | string (ISO 8601) | 마지막 동기화 시각 |
| syncedFiles | `Record<string, SyncedFileRecord>` | SHA → 동기화 기록 매핑 |
| syncHistory | `SyncRecord[]` | 최근 동기화 기록 (최대 100개) |

### SyncedFileRecord

개별 파일의 동기화 기록.

| Field | Type | Description |
|-------|------|-------------|
| filename | string | GitHub 원본 파일명 |
| path | string | GitHub 내 전체 경로 |
| syncedAt | string (ISO 8601) | 동기화 시각 |
| localPath | string | Vault 내 저장 경로 |

### SyncRecord

동기화 작업 결과 기록.

| Field | Type | Description |
|-------|------|-------------|
| timestamp | string (ISO 8601) | 작업 시각 |
| filesAdded | number | 추가된 파일 수 |
| filesSkipped | number | 스킵된 파일 수 |
| errors | string[] | 발생한 에러 메시지 목록 |

### GitHubFile

GitHub API 응답 파싱 결과. 런타임에만 사용, 저장되지 않음.

| Field | Type | Description |
|-------|------|-------------|
| name | string | 파일명 |
| path | string | 저장소 내 전체 경로 |
| sha | string | Git blob SHA |
| size | number | 파일 크기 (bytes) |
| downloadUrl | string | raw 콘텐츠 다운로드 URL |
| content | string? | base64 인코딩된 콘텐츠 (선택) |

---

## TypeScript Interfaces

```typescript
// 중복 처리 방식
type DuplicateHandling = 'skip' | 'overwrite' | 'rename';

// 플러그인 설정
interface GitHubInboxSyncSettings {
  // 인증
  githubToken: string;

  // 저장소
  repository: string;
  branch: string;

  // 경로
  sourcePath: string;
  targetPath: string;

  // 동기화 옵션
  syncOnStartup: boolean;
  autoSync: boolean;
  syncInterval: number;

  // 파일 처리
  duplicateHandling: DuplicateHandling;
  deleteAfterSync: boolean;
  moveToProcessed: boolean;

  // 알림
  showNotifications: boolean;
}

// 동기화 상태
interface SyncState {
  lastSyncTime: string | null;
  syncedFiles: Record<string, SyncedFileRecord>;
  syncHistory: SyncRecord[];
}

// 동기화된 파일 기록
interface SyncedFileRecord {
  filename: string;
  path: string;
  syncedAt: string;
  localPath: string;
}

// 동기화 작업 기록
interface SyncRecord {
  timestamp: string;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
}

// GitHub 파일 정보 (API 응답)
interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  downloadUrl: string;
  content?: string;
}

// GitHub API 에러 응답
interface GitHubApiError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}
```

---

## Default Values

```typescript
const DEFAULT_SETTINGS: GitHubInboxSyncSettings = {
  githubToken: '',
  repository: '',
  branch: 'main',
  sourcePath: 'inbox',
  targetPath: 'inbox',
  syncOnStartup: true,
  autoSync: true,
  syncInterval: 5,
  duplicateHandling: 'skip',
  deleteAfterSync: false,
  moveToProcessed: true,
  showNotifications: true,
};

const DEFAULT_SYNC_STATE: SyncState = {
  lastSyncTime: null,
  syncedFiles: {},
  syncHistory: [],
};
```

---

## Validation Rules

### Repository Format
```typescript
function isValidRepository(repo: string): boolean {
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo);
}
```

### Sync Interval Range
```typescript
function isValidSyncInterval(interval: number): boolean {
  return Number.isInteger(interval) && interval >= 1 && interval <= 60;
}
```

### Path Format
```typescript
function isValidPath(path: string): boolean {
  // 슬래시로 시작하지 않고, 상위 디렉토리 참조 없음
  return !path.startsWith('/') && !path.includes('..');
}
```

---

## State Transitions

### Sync Process Flow

```
[Idle] ──(sync triggered)──> [Fetching Files]
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              [No New Files]               [Files Found]
                    │                               │
                    ▼                               ▼
               [Complete]                  [Downloading]
                                                  │
                                    ┌─────────────┴─────────────┐
                                    ▼                           ▼
                              [Download OK]              [Download Error]
                                    │                           │
                            ┌───────┴───────┐                   │
                            ▼               ▼                   │
                     [Save to Vault]  [Skip Duplicate]          │
                            │               │                   │
                            ▼               ▼                   │
                    [Post-Processing]──────────────────────────>│
                            │                                   │
                            ▼                                   ▼
                       [Complete] <─────────────────────────────┘
```

### Cleanup Rules

1. **SyncedFiles Cleanup**: 90일 초과 기록 삭제
2. **SyncHistory Cleanup**: 최근 100개만 유지
3. **Trigger**: 매 동기화 완료 시 실행
