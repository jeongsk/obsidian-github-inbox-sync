/**
 * GitHub Inbox Sync - GitHub API Service
 */

import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';
import { CONFIG } from '../constants';
import { parseRepository } from '../utils/validation';
import { retryWithBackoff } from '../utils/backoff';
import type {
  GitHubFile,
  GitHubContentItem,
  ConnectionTestResult,
  GitHubInboxSyncSettings,
} from '../types';

/**
 * GitHub API 통신을 담당하는 서비스
 */
export class GitHubService {
  private token: string;
  private repository: string;
  private branch: string;
  private sourcePath: string;

  constructor(settings: GitHubInboxSyncSettings) {
    this.token = settings.githubToken;
    this.repository = settings.repository;
    this.branch = settings.branch;
    this.sourcePath = settings.sourcePath;
  }

  /**
   * 설정 업데이트
   */
  updateSettings(settings: GitHubInboxSyncSettings): void {
    this.token = settings.githubToken;
    this.repository = settings.repository;
    this.branch = settings.branch;
    this.sourcePath = settings.sourcePath;
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': CONFIG.GITHUB_API_VERSION,
    };
  }

  /**
   * Raw 콘텐츠 요청 헤더 생성
   */
  private getRawHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github.raw+json',
      Authorization: `Bearer ${this.token}`,
      'X-GitHub-Api-Version': CONFIG.GITHUB_API_VERSION,
    };
  }

  /**
   * 저장소 정보 파싱
   */
  private getRepoInfo(): { owner: string; repo: string } {
    const parsed = parseRepository(this.repository);
    if (!parsed) {
      throw new Error(`잘못된 저장소 형식: ${this.repository}`);
    }
    return parsed;
  }

  /**
   * 소스 폴더의 마크다운 파일 목록 조회
   */
  async listFiles(): Promise<GitHubFile[]> {
    const { owner, repo } = this.getRepoInfo();
    const path = this.sourcePath || '';
    const url = `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${this.branch}`;

    const response = await retryWithBackoff(async () => {
      return await requestUrl({
        url,
        headers: this.getHeaders(),
      });
    });

    // 빈 폴더인 경우
    if (!response.json || !Array.isArray(response.json)) {
      return [];
    }

    const items = response.json as GitHubContentItem[];

    // 마크다운 파일만 필터링
    return items
      .filter(
        (item) =>
          item.type === 'file' &&
          CONFIG.SUPPORTED_EXTENSIONS.some((ext) =>
            item.name.toLowerCase().endsWith(ext)
          )
      )
      .map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha,
        size: item.size,
        downloadUrl: item.download_url || '',
      }));
  }

  /**
   * 파일 내용 다운로드
   */
  async downloadContent(file: GitHubFile): Promise<string> {
    const { owner, repo } = this.getRepoInfo();
    const url = `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${file.path}?ref=${this.branch}`;

    const response = await retryWithBackoff(async () => {
      return await requestUrl({
        url,
        headers: this.getRawHeaders(),
      });
    });

    return response.text;
  }

  /**
   * 토큰 유효성 검증
   */
  async validateToken(): Promise<{ valid: boolean; user?: string; error?: string }> {
    try {
      const response = await requestUrl({
        url: `${CONFIG.GITHUB_API_BASE}/user`,
        headers: this.getHeaders(),
      });

      return {
        valid: true,
        user: response.json?.login,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('401') || message.includes('Bad credentials')) {
        return {
          valid: false,
          error: 'GitHub 토큰이 유효하지 않습니다',
        };
      }
      return {
        valid: false,
        error: `토큰 검증 실패: ${message}`,
      };
    }
  }

  /**
   * 저장소 접근 권한 확인
   */
  async validateRepository(): Promise<{ valid: boolean; fullName?: string; error?: string }> {
    try {
      const { owner, repo } = this.getRepoInfo();
      const response = await requestUrl({
        url: `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}`,
        headers: this.getHeaders(),
      });

      return {
        valid: true,
        fullName: response.json?.full_name,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('404')) {
        return {
          valid: false,
          error: '저장소를 찾을 수 없거나 접근 권한이 없습니다',
        };
      }
      return {
        valid: false,
        error: `저장소 검증 실패: ${message}`,
      };
    }
  }

  /**
   * 연결 테스트 (토큰 + 저장소)
   */
  async testConnection(): Promise<ConnectionTestResult> {
    // 토큰 검증
    const tokenResult = await this.validateToken();
    if (!tokenResult.valid) {
      return {
        success: false,
        error: tokenResult.error,
      };
    }

    // 저장소 검증
    const repoResult = await this.validateRepository();
    if (!repoResult.valid) {
      return {
        success: false,
        error: repoResult.error,
        user: tokenResult.user,
      };
    }

    return {
      success: true,
      user: tokenResult.user,
      repository: repoResult.fullName,
    };
  }

  /**
   * 파일 삭제
   */
  async deleteFile(file: GitHubFile): Promise<void> {
    const { owner, repo } = this.getRepoInfo();
    const url = `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${file.path}`;

    await retryWithBackoff(async () => {
      return await requestUrl({
        url,
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: `Synced to Obsidian: ${file.name}`,
          sha: file.sha,
          branch: this.branch,
        }),
      });
    });
  }

  /**
   * 파일을 processed/ 폴더로 이동
   */
  async moveToProcessed(file: GitHubFile, content: string): Promise<void> {
    const { owner, repo } = this.getRepoInfo();

    // 새 경로 생성
    const processedPath = file.path.replace(
      this.sourcePath,
      `${this.sourcePath}/../${CONFIG.PROCESSED_FOLDER}`
    ).replace(/\/+/g, '/').replace(/^\//, '');

    // 실제 경로 계산 (상위 디렉토리 참조 해결)
    const pathParts = this.sourcePath.split('/');
    pathParts.pop(); // 소스 폴더 제거
    pathParts.push(CONFIG.PROCESSED_FOLDER); // processed 폴더 추가
    pathParts.push(file.name);
    const newPath = pathParts.filter(Boolean).join('/');

    // 새 위치에 파일 생성
    const createUrl = `${CONFIG.GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${newPath}`;
    await retryWithBackoff(async () => {
      return await requestUrl({
        url: createUrl,
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          message: `Moved to processed: ${file.name}`,
          content: btoa(unescape(encodeURIComponent(content))),
          branch: this.branch,
        }),
      });
    });

    // 원본 파일 삭제
    await this.deleteFile(file);
  }
}
