# Quickstart: Startup Auto Sync

**Feature**: 2-startup-auto-sync
**Date**: 2025-12-28

---

## 개요

이 문서는 시작 동기화 개선 기능 구현을 위한 개발 가이드입니다.

---

## 구현 순서

### 1단계: 타입 및 상수 추가

**파일**: `src/types.ts`

```typescript
// GitHubInboxSyncSettings 인터페이스에 추가
startupSyncDelay: number;    // 시작 동기화 지연 시간 (초)
```

**파일**: `src/constants.ts`

```typescript
// DEFAULT_SETTINGS에 추가
startupSyncDelay: 3,

// CONFIG에 추가
MIN_STARTUP_SYNC_DELAY_SECONDS: 1,
MAX_STARTUP_SYNC_DELAY_SECONDS: 30,
DEFAULT_STARTUP_SYNC_DELAY_SECONDS: 3,
LAYOUT_READY_FALLBACK_TIMEOUT_MS: 30000,
```

---

### 2단계: 검증 함수 추가

**파일**: `src/utils/validation.ts`

```typescript
import { CONFIG } from '../constants';

export function isValidStartupSyncDelay(value: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= CONFIG.MIN_STARTUP_SYNC_DELAY_SECONDS &&
    value <= CONFIG.MAX_STARTUP_SYNC_DELAY_SECONDS
  );
}
```

---

### 3단계: 메인 플러그인 로직 수정

**파일**: `src/main.ts`

```typescript
export default class GitHubInboxSyncPlugin extends Plugin {
  // 기존 필드들...

  // 시작 동기화 상태 (신규)
  private startupSyncTimeoutId: number | null = null;
  private startupSyncFallbackId: number | null = null;
  private startupSyncExecuted: boolean = false;

  async onload() {
    await this.loadSettings();
    await this.initializeServices();

    // 시작 동기화 초기화 (기존 setTimeout 대체)
    this.initStartupSync();

    // 나머지 초기화...
  }

  onunload() {
    this.cancelStartupSync();
    this.stopAutoSync();
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
   * 동기화 실행 (수정)
   */
  async performSync(trigger: 'startup' | 'manual' | 'interval'): Promise<void> {
    // 수동 동기화 시 시작 동기화 취소
    if (trigger === 'manual') {
      this.cancelStartupSync();
      this.startupSyncExecuted = true;
    }

    // 기존 로직...
  }
}
```

---

### 4단계: 설정 UI 추가

**파일**: `src/ui/settings-tab.ts`

```typescript
// 동기화 옵션 섹션 내에 추가

// 시작 시 동기화 토글 (기존)
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

// 시작 동기화 지연 시간 (신규)
if (this.plugin.settings.syncOnStartup) {
  new Setting(containerEl)
    .setName('시작 동기화 지연 시간')
    .setDesc(`레이아웃 준비 후 동기화까지 대기 시간 (${CONFIG.MIN_STARTUP_SYNC_DELAY_SECONDS}-${CONFIG.MAX_STARTUP_SYNC_DELAY_SECONDS}초)`)
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
```

---

## 테스트 체크리스트

### 기능 테스트

- [ ] Obsidian 시작 시 설정된 지연 시간 후 동기화 실행
- [ ] 시작 동기화 비활성화 시 동기화 미실행
- [ ] 지연 시간 설정 변경이 저장됨
- [ ] 지연 시간 중 수동 동기화 시 시작 동기화 취소
- [ ] GitHub 토큰 미설정 시 시작 동기화 건너뛰기

### 성능 테스트

- [ ] 플러그인 로드 시간 측정 (0.5초 미만 증가)
- [ ] 대용량 vault에서 시작 성능 영향 없음
- [ ] 동기화 중 UI 멈춤 없음

### 엣지 케이스 테스트

- [ ] 레이아웃 준비 30초 초과 시 폴백 동작
- [ ] 지연 시간 중 Obsidian 종료 시 정상 종료
- [ ] 모바일 환경에서 동일하게 동작

---

## 주의사항

1. **기존 로직 제거**: `setTimeout(() => this.performSync('startup'), 2000)` 제거
2. **하위 호환성**: 기존 `syncOnStartup` 설정 유지
3. **타이머 정리**: `onunload`에서 모든 타이머 정리
4. **중복 실행 방지**: `startupSyncExecuted` 플래그로 중복 실행 방지

---

## 참고 파일

- [spec.md](./spec.md) - 기능 명세서
- [research.md](./research.md) - 기술 조사
- [data-model.md](./data-model.md) - 데이터 모델
- [contracts/startup-sync-api.md](./contracts/startup-sync-api.md) - API 계약
