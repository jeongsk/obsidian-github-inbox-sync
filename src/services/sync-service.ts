/**
 * GitHub Inbox Sync - Sync Service
 */

import { CONFIG } from '../constants';
import { GitHubService } from './github-service';
import { FileService } from './file-service';
import { StateService } from './state-service';
import type { GitHubInboxSyncSettings, SyncResult, GitHubFile } from '../types';

/**
 * 동기화 로직을 담당하는 서비스
 */
export class SyncService {
  private githubService: GitHubService;
  private fileService: FileService;
  private stateService: StateService;
  private settings: GitHubInboxSyncSettings;
  private syncing: boolean = false;

  constructor(
    githubService: GitHubService,
    fileService: FileService,
    stateService: StateService,
    settings: GitHubInboxSyncSettings
  ) {
    this.githubService = githubService;
    this.fileService = fileService;
    this.stateService = stateService;
    this.settings = settings;
  }

  /**
   * 설정 업데이트
   */
  updateSettings(settings: GitHubInboxSyncSettings): void {
    this.settings = settings;
  }

  /**
   * 동기화 진행 중인지 확인
   */
  isSyncing(): boolean {
    return this.syncing;
  }

  /**
   * 동기화 실행
   */
  async sync(): Promise<SyncResult> {
    if (this.syncing) {
      return {
        success: false,
        filesAdded: 0,
        filesSkipped: 0,
        errors: ['동기화가 이미 진행 중입니다'],
        duration: 0,
      };
    }

    this.syncing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let filesAdded = 0;
    let filesSkipped = 0;

    try {
      // 1. GitHub에서 파일 목록 가져오기
      const files = await this.githubService.listFiles();

      if (files.length === 0) {
        return {
          success: true,
          filesAdded: 0,
          filesSkipped: 0,
          errors: [],
          duration: Date.now() - startTime,
        };
      }

      // 2. 각 파일 처리
      for (const file of files) {
        try {
          const result = await this.processFile(file);
          if (result === 'added') {
            filesAdded++;
          } else if (result === 'skipped') {
            filesSkipped++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${file.name}: ${message}`);
        }
      }

      // 3. 상태 저장
      await this.stateService.save();

      // 4. 동기화 기록 추가
      this.stateService.addSyncRecord({
        filesAdded,
        filesSkipped,
        errors,
      });

      // 5. 오래된 기록 정리
      this.stateService.cleanup();
      await this.stateService.save();

      return {
        success: errors.length === 0,
        filesAdded,
        filesSkipped,
        errors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filesAdded,
        filesSkipped,
        errors: [message],
        duration: Date.now() - startTime,
      };
    } finally {
      this.syncing = false;
    }
  }

  /**
   * 개별 파일 처리
   */
  private async processFile(file: GitHubFile): Promise<'added' | 'skipped' | 'error'> {
    // SHA 확인 - 이미 동기화된 파일이면 스킵
    if (this.stateService.isAlreadySynced(file.sha)) {
      return 'skipped';
    }

    // 파일 내용 다운로드
    const content = await this.githubService.downloadContent(file);

    // 중복 처리를 포함한 파일 생성
    const localPath = await this.fileService.handleDuplicate(
      file.name,
      content,
      this.settings.duplicateHandling
    );

    // 스킵된 경우 (중복 처리 설정이 skip일 때)
    if (localPath === null) {
      // 동기화 기록은 남김 (다시 다운로드 방지)
      this.stateService.recordSync(file, '');
      return 'skipped';
    }

    // 동기화 기록
    this.stateService.recordSync(file, localPath);

    // 후처리 (GitHub에서 삭제/이동)
    await this.postProcess(file, content);

    return 'added';
  }

  /**
   * 동기화 후 GitHub 파일 처리
   */
  private async postProcess(file: GitHubFile, content: string): Promise<void> {
    try {
      if (this.settings.deleteAfterSync) {
        await this.githubService.deleteFile(file);
      } else if (this.settings.moveToProcessed) {
        await this.githubService.moveToProcessed(file, content);
      }
    } catch (error) {
      // 후처리 실패는 로컬 파일에 영향을 주지 않음
      console.error(`[GitHub Inbox Sync] 후처리 실패: ${file.name}`, error);
    }
  }
}
