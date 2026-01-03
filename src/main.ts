/**
 * GitHub Inbox Sync - Main Plugin
 */

import { Notice, Plugin, setIcon } from 'obsidian';
import { CONFIG, DEFAULT_SETTINGS, MESSAGES } from './constants';
import { GitHubInboxSyncSettingTab } from './ui/settings-tab';
import { GitHubService } from './services/github-service';
import { StateService } from './services/state-service';
import { SyncService } from './services/sync-service';
import { FileService } from './services/file-service';
import type { GitHubInboxSyncSettings } from './types';

export default class GitHubInboxSyncPlugin extends Plugin {
  settings: GitHubInboxSyncSettings;
  githubService: GitHubService | null = null;
  stateService: StateService | null = null;
  syncService: SyncService | null = null;
  fileService: FileService | null = null;

  private ribbonIconEl: HTMLElement | null = null;
  private autoSyncIntervalId: number | null = null;

  // 시작 동기화 상태
  private startupSyncTimeoutId: number | null = null;
  private startupSyncFallbackId: number | null = null;
  private startupSyncExecuted: boolean = false;

  async onload() {
    await this.loadSettings();
    await this.initializeServices();

    // 시작 동기화 초기화
    this.initStartupSync();

    // T024: 리본 아이콘 추가
    this.ribbonIconEl = this.addRibbonIcon('inbox', 'GitHub Inbox Sync', async () => {
      await this.performSync('manual');
    });

    // T025: 명령어 등록
    this.addCommand({
      id: 'sync-now',
      name: 'Sync now',
      callback: async () => {
        await this.performSync('manual');
      },
    });

    this.addCommand({
      id: 'open-settings',
      name: 'Open settings',
      callback: () => {
        // @ts-ignore - Obsidian API
        this.app.setting.open();
        // @ts-ignore - Obsidian API
        this.app.setting.openTabById(this.manifest.id);
      },
    });

    // 설정 탭 추가
    this.addSettingTab(new GitHubInboxSyncSettingTab(this.app, this));

    // T027: 자동 동기화 시작
    this.startAutoSync();
  }

  onunload() {
    this.cancelStartupSync();
    this.stopAutoSync();
  }

  /**
   * 서비스 초기화
   */
  private async initializeServices(): Promise<void> {
    this.stateService = new StateService(this);
    await this.stateService.load();

    this.githubService = new GitHubService(this.settings);
    this.fileService = new FileService(this.app, this.settings.targetPath);
    this.syncService = new SyncService(
      this.githubService,
      this.fileService,
      this.stateService,
      this.settings
    );
  }

  /**
   * 설정 로드
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /**
   * 설정 저장
   */
  async saveSettings() {
    await this.saveData(this.settings);

    // 서비스 설정 업데이트
    this.githubService?.updateSettings(this.settings);
    this.fileService?.updateTargetPath(this.settings.targetPath);
    this.syncService?.updateSettings(this.settings);
  }

  /**
   * 동기화 실행
   */
  async performSync(trigger: 'startup' | 'manual' | 'interval'): Promise<void> {
    // 수동 동기화 시 시작 동기화 취소
    if (trigger === 'manual') {
      this.cancelStartupSync();
      this.startupSyncExecuted = true;
    }

    if (!this.syncService) {
      new Notice('플러그인이 초기화되지 않았습니다');
      return;
    }

    if (this.syncService.isSyncing()) {
      if (this.settings.showNotifications) {
        new Notice(MESSAGES.syncInProgress());
      }
      return;
    }

    // 리본 아이콘 로딩 상태
    this.setRibbonLoading(true);

    try {
      const result = await this.syncService.sync();

      if (this.settings.showNotifications) {
        if (result.success) {
          // 수동 동기화일 때만 성공 알림 표시
          if (trigger === 'manual') {
            new Notice(MESSAGES.syncSuccess(result.filesAdded));
          }
        } else {
          // 에러 알림은 항상 표시
          new Notice(MESSAGES.syncError(result.errors.join(', ')));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.settings.showNotifications) {
        new Notice(MESSAGES.syncError(message));
      }
    } finally {
      this.setRibbonLoading(false);
    }
  }

  /**
   * 리본 아이콘 로딩 상태 설정
   */
  private setRibbonLoading(loading: boolean): void {
    if (!this.ribbonIconEl) return;

    if (loading) {
      setIcon(this.ribbonIconEl, 'loader');
      this.ribbonIconEl.addClass('is-loading');
    } else {
      setIcon(this.ribbonIconEl, 'inbox');
      this.ribbonIconEl.removeClass('is-loading');
    }
  }

  /**
   * 시작 동기화 초기화
   */
  private initStartupSync(): void {
    if (!this.settings.syncOnStartup) return;
    if (!this.settings.githubToken || !this.settings.repository) return;

    // 폴백 타이머 설정 (30초)
    this.startupSyncFallbackId = window.setTimeout(() => {
      if (!this.startupSyncExecuted) {
        this.scheduleStartupSync();
      }
    }, CONFIG.LAYOUT_READY_FALLBACK_TIMEOUT_MS);

    // 레이아웃 준비 시 동기화 예약
    this.app.workspace.onLayoutReady(() => {
      // 폴백 타이머 취소
      if (this.startupSyncFallbackId !== null) {
        window.clearTimeout(this.startupSyncFallbackId);
        this.startupSyncFallbackId = null;
      }

      this.scheduleStartupSync();
    });
  }

  /**
   * 시작 동기화 예약
   */
  private scheduleStartupSync(): void {
    if (this.startupSyncExecuted) return;
    if (this.startupSyncTimeoutId !== null) return;

    const delayMs = this.settings.startupSyncDelay * 1000;

    this.startupSyncTimeoutId = window.setTimeout(() => {
      this.startupSyncExecuted = true;
      this.startupSyncTimeoutId = null;
      this.performSync('startup');
    }, delayMs);
  }

  /**
   * 시작 동기화 취소
   */
  private cancelStartupSync(): void {
    if (this.startupSyncTimeoutId !== null) {
      window.clearTimeout(this.startupSyncTimeoutId);
      this.startupSyncTimeoutId = null;
    }
    if (this.startupSyncFallbackId !== null) {
      window.clearTimeout(this.startupSyncFallbackId);
      this.startupSyncFallbackId = null;
    }
  }

  /**
   * T027: 자동 동기화 시작
   */
  startAutoSync(): void {
    this.stopAutoSync();

    if (this.settings.autoSync && this.settings.githubToken && this.settings.repository) {
      const intervalMs = this.settings.syncInterval * 60 * 1000;
      this.autoSyncIntervalId = window.setInterval(() => {
        this.performSync('interval');
      }, intervalMs);

      this.registerInterval(this.autoSyncIntervalId);
    }
  }

  /**
   * T028: 자동 동기화 중지
   */
  stopAutoSync(): void {
    if (this.autoSyncIntervalId !== null) {
      window.clearInterval(this.autoSyncIntervalId);
      this.autoSyncIntervalId = null;
    }
  }

  /**
   * T029: 자동 동기화 설정 변경 처리
   */
  handleAutoSyncChange(): void {
    this.stopAutoSync();
    this.startAutoSync();
  }
}
