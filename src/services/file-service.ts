/**
 * GitHub Inbox Sync - File Service
 */

import { App, TFile, TFolder } from 'obsidian';
import type { DuplicateHandling } from '../types';

/**
 * Vault 파일 작업을 담당하는 서비스
 */
export class FileService {
  private app: App;
  private targetPath: string;

  constructor(app: App, targetPath: string) {
    this.app = app;
    this.targetPath = targetPath;
  }

  /**
   * 대상 경로 업데이트
   */
  updateTargetPath(targetPath: string): void {
    this.targetPath = targetPath;
  }

  /**
   * 대상 폴더 존재 확인 및 생성
   */
  async ensureTargetFolder(): Promise<void> {
    if (!this.targetPath) return;

    const vault = this.app.vault;
    const folder = vault.getAbstractFileByPath(this.targetPath);

    if (!folder) {
      await vault.createFolder(this.targetPath);
    }
  }

  /**
   * 파일 존재 여부 확인
   */
  fileExists(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    const file = this.app.vault.getAbstractFileByPath(filePath);
    return file instanceof TFile;
  }

  /**
   * 파일 경로 생성
   */
  private getFilePath(filename: string): string {
    if (this.targetPath) {
      return `${this.targetPath}/${filename}`;
    }
    return filename;
  }

  /**
   * 타임스탬프가 추가된 파일명 생성
   */
  private getTimestampedFilename(filename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const lastDotIndex = filename.lastIndexOf('.');

    if (lastDotIndex === -1) {
      return `${filename}-${timestamp}`;
    }

    const name = filename.slice(0, lastDotIndex);
    const ext = filename.slice(lastDotIndex);
    return `${name}-${timestamp}${ext}`;
  }

  /**
   * 파일 생성
   */
  async createFile(filename: string, content: string): Promise<string> {
    await this.ensureTargetFolder();

    const filePath = this.getFilePath(filename);
    await this.app.vault.create(filePath, content);

    return filePath;
  }

  /**
   * 중복 파일 처리
   * @returns 생성된 파일 경로 또는 null (스킵된 경우)
   */
  async handleDuplicate(
    filename: string,
    content: string,
    handling: DuplicateHandling
  ): Promise<string | null> {
    await this.ensureTargetFolder();

    const filePath = this.getFilePath(filename);
    const existingFile = this.app.vault.getAbstractFileByPath(filePath);

    // 파일이 존재하지 않으면 바로 생성
    if (!(existingFile instanceof TFile)) {
      await this.app.vault.create(filePath, content);
      return filePath;
    }

    // 중복 처리
    switch (handling) {
      case 'skip':
        // 스킵 - null 반환
        return null;

      case 'overwrite':
        // 덮어쓰기
        await this.app.vault.modify(existingFile, content);
        return filePath;

      case 'rename':
        // 새 이름으로 생성
        const newFilename = this.getTimestampedFilename(filename);
        const newPath = this.getFilePath(newFilename);
        await this.app.vault.create(newPath, content);
        return newPath;

      default:
        return null;
    }
  }

  /**
   * 파일 내용 읽기
   */
  async readFile(filename: string): Promise<string | null> {
    const filePath = this.getFilePath(filename);
    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file instanceof TFile) {
      return await this.app.vault.read(file);
    }

    return null;
  }

  /**
   * 파일 삭제
   */
  async deleteFile(filename: string): Promise<boolean> {
    const filePath = this.getFilePath(filename);
    const file = this.app.vault.getAbstractFileByPath(filePath);

    if (file instanceof TFile) {
      await this.app.vault.delete(file);
      return true;
    }

    return false;
  }
}
