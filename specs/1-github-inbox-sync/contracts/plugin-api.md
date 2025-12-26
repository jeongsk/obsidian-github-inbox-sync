# Plugin Internal API Contract

**Feature**: 1-github-inbox-sync
**Date**: 2025-12-26

---

## Core Service Interfaces

### SyncService

동기화 로직 담당

```typescript
interface SyncService {
  /**
   * 동기화 실행
   * @returns 동기화 결과
   */
  sync(): Promise<SyncResult>;

  /**
   * 동기화 진행 중인지 확인
   */
  isSyncing(): boolean;

  /**
   * 현재 동기화 취소 (진행 중인 경우)
   */
  cancel(): void;
}

interface SyncResult {
  success: boolean;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
  duration: number;  // milliseconds
}
```

### GitHubService

GitHub API 통신 담당

```typescript
interface GitHubService {
  /**
   * 소스 폴더의 마크다운 파일 목록 조회
   */
  listMarkdownFiles(): Promise<GitHubFile[]>;

  /**
   * 파일 내용 다운로드
   */
  downloadContent(file: GitHubFile): Promise<string>;

  /**
   * 파일 삭제
   */
  deleteFile(file: GitHubFile): Promise<void>;

  /**
   * 파일을 processed/ 폴더로 이동
   */
  moveToProcessed(file: GitHubFile, content: string): Promise<void>;

  /**
   * 연결 테스트
   */
  testConnection(): Promise<ConnectionTestResult>;
}

interface ConnectionTestResult {
  success: boolean;
  error?: string;
  user?: string;       // 인증된 사용자명
  repository?: string; // 접근 가능한 저장소명
}
```

### FileService

로컬 Vault 파일 작업 담당

```typescript
interface FileService {
  /**
   * 대상 폴더에 파일 생성
   * @param filename 파일명
   * @param content 파일 내용
   * @returns 생성된 파일 경로
   */
  createFile(filename: string, content: string): Promise<string>;

  /**
   * 파일 존재 여부 확인
   */
  fileExists(filename: string): Promise<boolean>;

  /**
   * 대상 폴더 존재 확인 및 생성
   */
  ensureTargetFolder(): Promise<void>;

  /**
   * 중복 파일 처리
   * @returns 처리 결과 (생성된 경로 또는 null=스킵)
   */
  handleDuplicate(
    filename: string,
    content: string,
    handling: DuplicateHandling
  ): Promise<string | null>;
}
```

### StateService

동기화 상태 관리

```typescript
interface StateService {
  /**
   * 파일이 이미 동기화되었는지 확인
   */
  isAlreadySynced(sha: string): boolean;

  /**
   * 동기화 완료 기록
   */
  recordSync(file: GitHubFile, localPath: string): void;

  /**
   * 동기화 기록 저장
   */
  save(): Promise<void>;

  /**
   * 동기화 기록 로드
   */
  load(): Promise<void>;

  /**
   * 오래된 기록 정리 (90일 초과)
   */
  cleanup(): void;

  /**
   * 전체 기록 초기화
   */
  reset(): Promise<void>;

  /**
   * 마지막 동기화 시각
   */
  getLastSyncTime(): string | null;

  /**
   * 동기화 기록 수
   */
  getSyncedCount(): number;
}
```

---

## Event System

### SyncEvents

```typescript
type SyncEventType =
  | 'sync:start'
  | 'sync:progress'
  | 'sync:complete'
  | 'sync:error'
  | 'sync:cancel';

interface SyncStartEvent {
  type: 'sync:start';
  trigger: 'startup' | 'manual' | 'interval';
}

interface SyncProgressEvent {
  type: 'sync:progress';
  current: number;
  total: number;
  filename: string;
}

interface SyncCompleteEvent {
  type: 'sync:complete';
  result: SyncResult;
}

interface SyncErrorEvent {
  type: 'sync:error';
  error: Error;
  recoverable: boolean;
}

interface SyncCancelEvent {
  type: 'sync:cancel';
  reason: string;
}
```

---

## Settings Validation

```typescript
interface SettingsValidator {
  /**
   * 전체 설정 유효성 검증
   */
  validate(settings: GitHubInboxSyncSettings): ValidationResult;

  /**
   * 저장소 형식 검증
   */
  validateRepository(repo: string): boolean;

  /**
   * 토큰 형식 검증 (실제 유효성은 API 호출 필요)
   */
  validateTokenFormat(token: string): boolean;

  /**
   * 동기화 간격 범위 검증
   */
  validateSyncInterval(interval: number): boolean;

  /**
   * 경로 형식 검증
   */
  validatePath(path: string): boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
}
```

---

## Commands

```typescript
interface PluginCommands {
  /**
   * 즉시 동기화 실행
   * Command ID: 'github-inbox-sync:sync-now'
   */
  syncNow(): Promise<void>;

  /**
   * 설정 화면 열기
   * Command ID: 'github-inbox-sync:open-settings'
   */
  openSettings(): void;

  /**
   * 동기화 기록 초기화
   * Command ID: 'github-inbox-sync:clear-history'
   */
  clearHistory(): Promise<void>;
}
```

---

## Ribbon Icon States

```typescript
type RibbonIconState = 'idle' | 'syncing' | 'error' | 'success';

interface RibbonIconConfig {
  idle: {
    icon: 'inbox';
    tooltip: 'GitHub Inbox Sync';
  };
  syncing: {
    icon: 'loader';
    tooltip: 'Syncing...';
    cssClass: 'is-loading';
  };
  error: {
    icon: 'inbox';
    tooltip: 'Last sync failed';
    cssClass: 'has-error';
  };
  success: {
    icon: 'inbox';
    tooltip: 'Last sync: {time}';
  };
}
```

---

## Notification Messages

```typescript
interface NotificationMessages {
  // 동기화 결과
  syncSuccess: (count: number) => string;
  // "Synced {count} new notes from GitHub"

  syncNoNewFiles: () => string;
  // "No new notes to sync"

  syncError: (error: string) => string;
  // "Sync failed: {error}"

  // 연결 테스트
  connectionSuccess: (user: string, repo: string) => string;
  // "Connected as {user} to {repo}"

  connectionFailed: (error: string) => string;
  // "Connection failed: {error}"

  // 기타
  syncInProgress: () => string;
  // "Sync already in progress"

  historyCleared: () => string;
  // "Sync history cleared"
}
```

---

## Configuration Constants

```typescript
const CONFIG = {
  // API
  GITHUB_API_BASE: 'https://api.github.com',
  GITHUB_API_VERSION: '2022-11-28',

  // Rate Limiting
  RATE_LIMIT_BUFFER: 10,           // 남은 요청 수가 이 이하면 대기
  BACKOFF_INITIAL_MS: 1000,
  BACKOFF_MAX_MS: 60000,
  BACKOFF_MULTIPLIER: 2,
  MAX_RETRIES: 5,

  // Sync
  MIN_SYNC_INTERVAL_MINUTES: 1,
  MAX_SYNC_INTERVAL_MINUTES: 60,
  DEFAULT_SYNC_INTERVAL_MINUTES: 5,

  // State Management
  MAX_SYNC_HISTORY: 100,
  SYNC_RECORD_RETENTION_DAYS: 90,

  // File Processing
  PROCESSED_FOLDER: 'processed',
  SUPPORTED_EXTENSIONS: ['.md'],
} as const;
```
