/**
 * GitHub Inbox Sync - Type Definitions
 */

// 중복 처리 방식
export type DuplicateHandling = 'skip' | 'overwrite' | 'rename';

/**
 * 플러그인 설정
 */
export interface GitHubInboxSyncSettings {
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

/**
 * 동기화 상태
 */
export interface SyncState {
  lastSyncTime: string | null;
  syncedFiles: Record<string, SyncedFileRecord>;
  syncHistory: SyncRecord[];
}

/**
 * 동기화된 파일 기록
 */
export interface SyncedFileRecord {
  filename: string;
  path: string;
  syncedAt: string;
  localPath: string;
}

/**
 * 동기화 작업 기록
 */
export interface SyncRecord {
  timestamp: string;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
}

/**
 * GitHub 파일 정보 (API 응답)
 */
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  downloadUrl: string;
  content?: string;
}

/**
 * GitHub API 콘텐츠 아이템 (원시 API 응답)
 */
export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url: string | null;
  html_url: string;
  git_url: string;
  url: string;
  content?: string;
  encoding?: string;
}

/**
 * GitHub API 에러 응답
 */
export interface GitHubApiError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  success: boolean;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
  duration: number;
}

/**
 * 연결 테스트 결과
 */
export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  user?: string;
  repository?: string;
}

/**
 * 설정 검증 결과
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * 검증 에러
 */
export interface ValidationError {
  field: string;
  message: string;
}
