/**
 * GitHub Inbox Sync - State Service
 */

import type { Plugin } from 'obsidian';
import { CONFIG, DEFAULT_SYNC_STATE } from '../constants';
import type { SyncState, SyncedFileRecord, SyncRecord, GitHubFile } from '../types';

const STATE_KEY = 'syncState';

/**
 * 동기화 상태 관리 서비스
 */
export class StateService {
  private plugin: Plugin;
  private state: SyncState;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.state = { ...DEFAULT_SYNC_STATE };
  }

  /**
   * 상태 로드
   */
  async load(): Promise<void> {
    const data = await this.plugin.loadData();
    if (data && data[STATE_KEY]) {
      this.state = {
        ...DEFAULT_SYNC_STATE,
        ...data[STATE_KEY],
      };
    } else {
      this.state = { ...DEFAULT_SYNC_STATE };
    }
  }

  /**
   * 상태 저장
   */
  async save(): Promise<void> {
    const data = (await this.plugin.loadData()) || {};
    data[STATE_KEY] = this.state;
    await this.plugin.saveData(data);
  }

  /**
   * 파일이 이미 동기화되었는지 확인
   */
  isAlreadySynced(sha: string): boolean {
    return sha in this.state.syncedFiles;
  }

  /**
   * 동기화 완료 기록
   */
  recordSync(file: GitHubFile, localPath: string): void {
    const record: SyncedFileRecord = {
      filename: file.name,
      path: file.path,
      syncedAt: new Date().toISOString(),
      localPath,
    };

    this.state.syncedFiles[file.sha] = record;
    this.state.lastSyncTime = new Date().toISOString();
  }

  /**
   * 동기화 작업 결과 기록
   */
  addSyncRecord(record: Omit<SyncRecord, 'timestamp'>): void {
    const fullRecord: SyncRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    };

    this.state.syncHistory.unshift(fullRecord);

    // 최대 기록 수 유지
    if (this.state.syncHistory.length > CONFIG.MAX_SYNC_HISTORY) {
      this.state.syncHistory = this.state.syncHistory.slice(0, CONFIG.MAX_SYNC_HISTORY);
    }
  }

  /**
   * 마지막 동기화 시각
   */
  getLastSyncTime(): string | null {
    return this.state.lastSyncTime;
  }

  /**
   * 동기화 기록 수
   */
  getSyncedCount(): number {
    return Object.keys(this.state.syncedFiles).length;
  }

  /**
   * 동기화 기록 (가장 오래된 날짜)
   */
  getOldestRecordDate(): string | null {
    const records = Object.values(this.state.syncedFiles);
    if (records.length === 0) return null;

    const oldest = records.reduce((oldest, record) => {
      return new Date(record.syncedAt) < new Date(oldest.syncedAt) ? record : oldest;
    });

    return oldest.syncedAt;
  }

  /**
   * 오래된 기록 정리 (90일 초과)
   */
  cleanup(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.SYNC_RECORD_RETENTION_DAYS);

    let removedCount = 0;

    for (const [sha, record] of Object.entries(this.state.syncedFiles)) {
      if (new Date(record.syncedAt) < cutoffDate) {
        delete this.state.syncedFiles[sha];
        removedCount++;
      }
    }

    // 동기화 히스토리도 정리
    this.state.syncHistory = this.state.syncHistory.filter(
      (record) => new Date(record.timestamp) >= cutoffDate
    );

    return removedCount;
  }

  /**
   * 전체 기록 초기화
   */
  async reset(): Promise<void> {
    this.state = { ...DEFAULT_SYNC_STATE };
    await this.save();
  }

  /**
   * 현재 상태 반환 (읽기 전용)
   */
  getState(): Readonly<SyncState> {
    return this.state;
  }
}
