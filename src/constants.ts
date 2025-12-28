/**
 * GitHub Inbox Sync - Constants
 */

import type { GitHubInboxSyncSettings, SyncState } from './types';

/**
 * 기본 설정값
 */
export const DEFAULT_SETTINGS: GitHubInboxSyncSettings = {
  githubToken: '',
  repository: '',
  branch: 'main',
  sourcePath: 'inbox',
  targetPath: 'inbox',
  syncOnStartup: true,
  startupSyncDelay: 3,
  autoSync: true,
  syncInterval: 5,
  duplicateHandling: 'skip',
  deleteAfterSync: false,
  moveToProcessed: true,
  showNotifications: true,
};

/**
 * 기본 동기화 상태
 */
export const DEFAULT_SYNC_STATE: SyncState = {
  lastSyncTime: null,
  syncedFiles: {},
  syncHistory: [],
};

/**
 * 설정 상수
 */
export const CONFIG = {
  // API
  GITHUB_API_BASE: 'https://api.github.com',
  GITHUB_API_VERSION: '2022-11-28',

  // Rate Limiting
  RATE_LIMIT_BUFFER: 10,
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

  // Startup Sync
  MIN_STARTUP_SYNC_DELAY_SECONDS: 1,
  MAX_STARTUP_SYNC_DELAY_SECONDS: 30,
  DEFAULT_STARTUP_SYNC_DELAY_SECONDS: 3,
  LAYOUT_READY_FALLBACK_TIMEOUT_MS: 30000,

  // File Processing
  PROCESSED_FOLDER: 'processed',
  SUPPORTED_EXTENSIONS: ['.md'],
} as const;

/**
 * 알림 메시지
 */
export const MESSAGES = {
  // 동기화 결과
  syncSuccess: (count: number) =>
    count > 0
      ? `GitHub에서 ${count}개의 새 노트를 동기화했습니다`
      : '동기화할 새 노트가 없습니다',
  syncNoNewFiles: () => '동기화할 새 노트가 없습니다',
  syncError: (error: string) => `동기화 실패: ${error}`,
  syncInProgress: () => '동기화가 이미 진행 중입니다',

  // 연결 테스트
  connectionSuccess: (user: string, repo: string) =>
    `${user}로 ${repo}에 연결되었습니다`,
  connectionFailed: (error: string) => `연결 실패: ${error}`,
  connectionTesting: () => '연결 테스트 중...',

  // 기타
  historyCleared: () => '동기화 기록이 초기화되었습니다',
  settingsSaved: () => '설정이 저장되었습니다',
} as const;
