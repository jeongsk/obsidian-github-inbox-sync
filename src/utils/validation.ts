/**
 * GitHub Inbox Sync - Validation Utilities
 */

import { CONFIG } from '../constants';
import type { GitHubInboxSyncSettings, ValidationResult, ValidationError } from '../types';

/**
 * 저장소 형식 검증 (owner/repo)
 */
export function isValidRepository(repo: string): boolean {
  if (!repo || repo.trim() === '') return false;
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo.trim());
}

/**
 * 토큰 형식 검증 (기본적인 형식만 확인, 실제 유효성은 API 호출 필요)
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || token.trim() === '') return false;
  // Fine-grained PAT: github_pat_로 시작
  // Classic PAT: ghp_로 시작
  // 또는 40자 이상의 문자열
  const trimmed = token.trim();
  return (
    trimmed.startsWith('ghp_') ||
    trimmed.startsWith('github_pat_') ||
    trimmed.length >= 40
  );
}

/**
 * 동기화 간격 범위 검증
 */
export function isValidSyncInterval(interval: number): boolean {
  return (
    Number.isInteger(interval) &&
    interval >= CONFIG.MIN_SYNC_INTERVAL_MINUTES &&
    interval <= CONFIG.MAX_SYNC_INTERVAL_MINUTES
  );
}

/**
 * 시작 동기화 지연 시간 범위 검증
 */
export function isValidStartupSyncDelay(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= CONFIG.MIN_STARTUP_SYNC_DELAY_SECONDS &&
    value <= CONFIG.MAX_STARTUP_SYNC_DELAY_SECONDS
  );
}

/**
 * 경로 형식 검증
 */
export function isValidPath(path: string): boolean {
  if (path === '') return true; // 빈 경로는 루트를 의미
  // 슬래시로 시작하지 않고, 상위 디렉토리 참조 없음
  return !path.startsWith('/') && !path.includes('..');
}

/**
 * 전체 설정 유효성 검증
 */
export function validateSettings(settings: GitHubInboxSyncSettings): ValidationResult {
  const errors: ValidationError[] = [];

  // 토큰 검증
  if (!settings.githubToken) {
    errors.push({
      field: 'githubToken',
      message: 'GitHub 토큰을 입력해주세요',
    });
  } else if (!isValidTokenFormat(settings.githubToken)) {
    errors.push({
      field: 'githubToken',
      message: '올바른 GitHub 토큰 형식이 아닙니다',
    });
  }

  // 저장소 검증
  if (!settings.repository) {
    errors.push({
      field: 'repository',
      message: '저장소를 입력해주세요 (예: owner/repo)',
    });
  } else if (!isValidRepository(settings.repository)) {
    errors.push({
      field: 'repository',
      message: '올바른 저장소 형식이 아닙니다 (예: owner/repo)',
    });
  }

  // 브랜치 검증
  if (!settings.branch || settings.branch.trim() === '') {
    errors.push({
      field: 'branch',
      message: '브랜치를 입력해주세요',
    });
  }

  // 경로 검증
  if (!isValidPath(settings.sourcePath)) {
    errors.push({
      field: 'sourcePath',
      message: '올바른 소스 경로 형식이 아닙니다',
    });
  }

  if (!isValidPath(settings.targetPath)) {
    errors.push({
      field: 'targetPath',
      message: '올바른 대상 경로 형식이 아닙니다',
    });
  }

  // 동기화 간격 검증
  if (!isValidSyncInterval(settings.syncInterval)) {
    errors.push({
      field: 'syncInterval',
      message: `동기화 간격은 ${CONFIG.MIN_SYNC_INTERVAL_MINUTES}~${CONFIG.MAX_SYNC_INTERVAL_MINUTES}분 사이여야 합니다`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 저장소 문자열에서 owner와 repo 추출
 */
export function parseRepository(repository: string): { owner: string; repo: string } | null {
  if (!isValidRepository(repository)) return null;
  const [owner, repo] = repository.split('/');
  return { owner, repo };
}
