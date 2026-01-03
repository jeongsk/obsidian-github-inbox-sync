/**
 * GitHub Inbox Sync - Settings Tab
 */

import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type GitHubInboxSyncPlugin from '../main';
import { CONFIG, MESSAGES } from '../constants';
import { isValidRepository, isValidSyncInterval } from '../utils/validation';
import type { DuplicateHandling } from '../types';
import { FolderSuggest } from './folder-suggest';

/**
 * 플러그인 설정 탭
 */
export class GitHubInboxSyncSettingTab extends PluginSettingTab {
  plugin: GitHubInboxSyncPlugin;
  private testConnectionButton: HTMLButtonElement | null = null;

  constructor(app: App, plugin: GitHubInboxSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'GitHub Inbox Sync 설정' });

    // === 인증 섹션 ===
    containerEl.createEl('h3', { text: '인증' });

    // GitHub 토큰
    new Setting(containerEl)
      .setName('GitHub Personal Access Token')
      .setDesc('github.com/settings/tokens에서 토큰을 생성하세요')
      .addText((text) => {
        text.inputEl.type = 'password'; // T012: 토큰 마스킹
        text
          .setPlaceholder('ghp_xxxxxxxxxxxx')
          .setValue(this.plugin.settings.githubToken)
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          });
      });

    // 저장소
    const repoSetting = new Setting(containerEl)
      .setName('저장소')
      .setDesc('형식: owner/repo')
      .addText((text) => {
        text
          .setPlaceholder('username/obsidian-inbox')
          .setValue(this.plugin.settings.repository)
          .onChange(async (value) => {
            this.plugin.settings.repository = value;

            // T013: 저장소 형식 검증
            if (value && !isValidRepository(value)) {
              text.inputEl.addClass('has-error');
              repoSetting.descEl.setText('올바른 형식이 아닙니다 (예: owner/repo)');
              repoSetting.descEl.addClass('mod-warning');
            } else {
              text.inputEl.removeClass('has-error');
              repoSetting.descEl.setText('형식: owner/repo');
              repoSetting.descEl.removeClass('mod-warning');
            }

            await this.plugin.saveSettings();
          });
      });

    // 브랜치
    new Setting(containerEl)
      .setName('브랜치')
      .setDesc('동기화할 브랜치')
      .addText((text) =>
        text
          .setPlaceholder('main')
          .setValue(this.plugin.settings.branch)
          .onChange(async (value) => {
            this.plugin.settings.branch = value || 'main';
            await this.plugin.saveSettings();
          })
      );

    // T017: 연결 테스트 버튼
    new Setting(containerEl)
      .setName('연결 테스트')
      .setDesc('토큰과 저장소 접근을 확인합니다')
      .addButton((button) => {
        this.testConnectionButton = button.buttonEl;
        button
          .setButtonText('연결 테스트')
          .setCta()
          .onClick(async () => {
            await this.handleTestConnection(button.buttonEl);
          });
      });

    // === 경로 섹션 ===
    containerEl.createEl('h3', { text: '경로' });

    new Setting(containerEl)
      .setName('소스 폴더 (GitHub)')
      .setDesc('GitHub 저장소 내 폴더 경로')
      .addText((text) =>
        text
          .setPlaceholder('inbox')
          .setValue(this.plugin.settings.sourcePath)
          .onChange(async (value) => {
            this.plugin.settings.sourcePath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('대상 폴더 (Vault)')
      .setDesc('Obsidian vault 내 저장 폴더')
      .addSearch((search) => {
        search
          .setPlaceholder('inbox')
          .setValue(this.plugin.settings.targetPath)
          .onChange(async (value) => {
            this.plugin.settings.targetPath = value;
            await this.plugin.saveSettings();
          });

        new FolderSuggest(this.app, search.inputEl);
      });

    // === 동기화 옵션 섹션 ===
    containerEl.createEl('h3', { text: '동기화 옵션' });

    new Setting(containerEl)
      .setName('시작 시 동기화')
      .setDesc('Obsidian 시작 시 자동으로 동기화')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncOnStartup)
          .onChange(async (value) => {
            this.plugin.settings.syncOnStartup = value;
            await this.plugin.saveSettings();
            this.display(); // UI 새로고침 (지연 시간 설정 표시/숨김)
          })
      );

    // 시작 동기화 지연 시간 (syncOnStartup 활성화 시에만 표시)
    if (this.plugin.settings.syncOnStartup) {
      new Setting(containerEl)
        .setName('시작 동기화 지연 시간')
        .setDesc(
          `레이아웃 준비 후 동기화까지 대기 시간 (${CONFIG.MIN_STARTUP_SYNC_DELAY_SECONDS}-${CONFIG.MAX_STARTUP_SYNC_DELAY_SECONDS}초)`
        )
        .addSlider((slider) =>
          slider
            .setLimits(
              CONFIG.MIN_STARTUP_SYNC_DELAY_SECONDS,
              CONFIG.MAX_STARTUP_SYNC_DELAY_SECONDS,
              1
            )
            .setValue(this.plugin.settings.startupSyncDelay)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.plugin.settings.startupSyncDelay = value;
              await this.plugin.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName('자동 동기화')
      .setDesc('백그라운드에서 주기적으로 동기화')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSync)
          .onChange(async (value) => {
            this.plugin.settings.autoSync = value;
            await this.plugin.saveSettings();
            // T029: 자동 동기화 상태 변경 시 즉시 적용
            this.plugin.handleAutoSyncChange();
          })
      );

    const intervalSetting = new Setting(containerEl)
      .setName('동기화 간격 (분)')
      .setDesc(`${CONFIG.MIN_SYNC_INTERVAL_MINUTES}~${CONFIG.MAX_SYNC_INTERVAL_MINUTES}분`)
      .addText((text) =>
        text
          .setPlaceholder('5')
          .setValue(String(this.plugin.settings.syncInterval))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && isValidSyncInterval(num)) {
              this.plugin.settings.syncInterval = num;
              text.inputEl.removeClass('has-error');
              intervalSetting.descEl.removeClass('mod-warning');
              await this.plugin.saveSettings();
              // T029: 간격 변경 시 즉시 적용
              this.plugin.handleAutoSyncChange();
            } else {
              text.inputEl.addClass('has-error');
              intervalSetting.descEl.addClass('mod-warning');
            }
          })
      );

    // === 파일 처리 섹션 ===
    containerEl.createEl('h3', { text: '파일 처리' });

    new Setting(containerEl)
      .setName('중복 파일 처리')
      .setDesc('동일한 파일명이 존재할 때 처리 방식')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('skip', '스킵 (기존 유지)')
          .addOption('overwrite', '덮어쓰기')
          .addOption('rename', '이름 변경 (타임스탬프 추가)')
          .setValue(this.plugin.settings.duplicateHandling)
          .onChange(async (value: DuplicateHandling) => {
            this.plugin.settings.duplicateHandling = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('processed 폴더로 이동')
      .setDesc('동기화 후 GitHub에서 processed/ 폴더로 이동')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.moveToProcessed)
          .onChange(async (value) => {
            this.plugin.settings.moveToProcessed = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('동기화 후 삭제')
      .setDesc('동기화 후 GitHub에서 파일 삭제')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.deleteAfterSync)
          .onChange(async (value) => {
            this.plugin.settings.deleteAfterSync = value;
            // 삭제와 이동은 상호 배타적
            if (value) {
              this.plugin.settings.moveToProcessed = false;
            }
            await this.plugin.saveSettings();
            this.display(); // UI 새로고침
          })
      );

    // === 알림 섹션 ===
    containerEl.createEl('h3', { text: '알림' });

    new Setting(containerEl)
      .setName('알림 표시')
      .setDesc('동기화 이벤트에 대한 알림 표시')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showNotifications)
          .onChange(async (value) => {
            this.plugin.settings.showNotifications = value;
            await this.plugin.saveSettings();
          })
      );

    // === 동기화 기록 섹션 ===
    containerEl.createEl('h3', { text: '동기화 기록' });

    const syncedCount = this.plugin.stateService?.getSyncedCount() ?? 0;
    const oldestDate = this.plugin.stateService?.getOldestRecordDate();

    new Setting(containerEl)
      .setName('동기화된 파일 수')
      .setDesc(
        oldestDate
          ? `가장 오래된 기록: ${new Date(oldestDate).toLocaleDateString()}`
          : '기록 없음'
      )
      .addButton((button) =>
        button
          .setButtonText(`${syncedCount}개 파일`)
          .setDisabled(true)
      );

    new Setting(containerEl)
      .setName('기록 초기화')
      .setDesc('동기화 기록을 초기화합니다. 이전에 동기화된 파일이 다시 다운로드될 수 있습니다.')
      .addButton((button) =>
        button
          .setButtonText('기록 초기화')
          .setWarning()
          .onClick(async () => {
            if (confirm('정말로 동기화 기록을 초기화하시겠습니까?')) {
              await this.plugin.stateService?.reset();
              new Notice(MESSAGES.historyCleared());
              this.display(); // UI 새로고침
            }
          })
      );
  }

  /**
   * 연결 테스트 처리
   */
  private async handleTestConnection(buttonEl: HTMLButtonElement): Promise<void> {
    const originalText = buttonEl.textContent || '연결 테스트';
    buttonEl.textContent = '테스트 중...';
    buttonEl.disabled = true;

    try {
      const result = await this.plugin.githubService?.testConnection();

      if (result?.success) {
        new Notice(MESSAGES.connectionSuccess(result.user || '', result.repository || ''));
      } else {
        new Notice(MESSAGES.connectionFailed(result?.error || '알 수 없는 오류'));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(MESSAGES.connectionFailed(message));
    } finally {
      buttonEl.textContent = originalText;
      buttonEl.disabled = false;
    }
  }
}
