import { AbstractInputSuggest, App, TFolder } from 'obsidian';

/**
 * Vault 내 폴더 목록을 자동완성으로 제안하는 컴포넌트
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
  }

  /**
   * 입력 문자열에 따라 일치하는 폴더 목록 반환
   */
  getSuggestions(inputStr: string): TFolder[] {
    const allFolders = this.app.vault.getAllFolders();
    const lowerInput = inputStr.toLowerCase();

    return allFolders.filter((folder) =>
      folder.path.toLowerCase().includes(lowerInput)
    );
  }

  /**
   * 제안 항목 렌더링
   */
  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path);
  }

  /**
   * 폴더 선택 시 입력 필드에 값 설정
   */
  selectSuggestion(folder: TFolder): void {
    this.setValue(folder.path);
    this.close();
  }
}
