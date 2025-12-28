# Research: Startup Auto Sync

**Feature**: 2-startup-auto-sync
**Date**: 2025-12-28

---

## 기술 조사 항목

### 1. Obsidian Workspace Layout Ready 이벤트

**결정**: `this.app.workspace.onLayoutReady()` 메서드 사용

**근거**:
- Obsidian 공식 API로 제공되는 안정적인 메서드
- 레이아웃이 이미 준비된 경우 콜백을 즉시 실행
- 레이아웃이 아직 준비되지 않은 경우 큐에 추가하여 나중에 실행
- API 버전 0.11.0부터 지원

**시그니처**:
```typescript
onLayoutReady(callback: () => any): void;
```

**사용 예시**:
```typescript
this.app.workspace.onLayoutReady(() => {
  // 레이아웃 준비 후 실행할 코드
});
```

**대안 검토**:
- `setTimeout(callback, 2000)`: 현재 구현 방식. 고정 시간으로 불안정
- `workspace.layoutReady` 속성 확인: 폴링 필요, 비효율적

---

### 2. 플러그인 로드 시간 최적화 모범 사례

**결정**: `onLayoutReady` 콜백 내에서 시작 동기화 실행

**근거**:
Obsidian 개발자 문서에 따르면:
- 플러그인 `onload` 함수는 초기화에 필요한 코드만 포함해야 함
- 계산이 많거나 데이터를 가져오는 작업은 `onload`에서 피해야 함
- 시작 시 실행할 코드는 `onLayoutReady` 콜백 내에 배치 권장
- 이 콜백은 지연되어 Obsidian이 로딩을 완료한 후에만 호출됨

**영향**:
- 플러그인 로드 시간이 앱 시작 시간에 미치는 영향 최소화
- 사용자가 앱과 상호작용하기 전에 필수 기능만 로드

---

### 3. 타이머 취소 메커니즘

**결정**: `window.setTimeout` + `window.clearTimeout` 조합 사용

**근거**:
- 기존 자동 동기화에서 사용 중인 `window.setInterval`/`window.clearInterval`과 일관성
- Obsidian Plugin API의 `registerInterval`과 호환
- 간단하고 검증된 패턴

**구현 패턴**:
```typescript
private startupSyncTimeoutId: number | null = null;

// 타이머 설정
this.startupSyncTimeoutId = window.setTimeout(() => {
  this.performSync('startup');
  this.startupSyncTimeoutId = null;
}, delayMs);

// 타이머 취소
if (this.startupSyncTimeoutId !== null) {
  window.clearTimeout(this.startupSyncTimeoutId);
  this.startupSyncTimeoutId = null;
}
```

---

### 4. 폴백 타임아웃 메커니즘

**결정**: 30초 폴백 타임아웃 구현

**근거**:
- `layout-ready` 이벤트가 발생하지 않는 엣지 케이스 대비
- 30초는 대부분의 환경에서 충분한 대기 시간
- 무한 대기 방지

**구현 패턴**:
```typescript
const FALLBACK_TIMEOUT_MS = 30000;

// 폴백 타이머 설정
const fallbackTimer = window.setTimeout(() => {
  if (!this.startupSyncExecuted) {
    this.scheduleStartupSync();
  }
}, FALLBACK_TIMEOUT_MS);

// onLayoutReady 콜백
this.app.workspace.onLayoutReady(() => {
  window.clearTimeout(fallbackTimer);
  this.scheduleStartupSync();
});
```

---

### 5. 기존 설정 확장

**결정**: `GitHubInboxSyncSettings`에 `startupSyncDelay` 필드 추가

**근거**:
- 기존 `syncOnStartup` 설정을 유지하여 하위 호환성 보장
- 새 설정만 추가하여 기존 사용자 데이터에 영향 없음
- `DEFAULT_SETTINGS`에 기본값 추가로 마이그레이션 불필요

**타입 변경**:
```typescript
interface GitHubInboxSyncSettings {
  // 기존 필드들...
  syncOnStartup: boolean;      // 기존 유지
  startupSyncDelay: number;    // 신규 추가 (기본값: 3)
}
```

---

### 6. 설정 UI 컴포넌트

**결정**: Obsidian의 `SliderComponent` 사용

**근거**:
- 1-30초 범위의 숫자 입력에 적합
- 시각적으로 직관적인 UI 제공
- 기존 설정 탭 UI와 일관성 유지

**구현 예시**:
```typescript
new Setting(containerEl)
  .setName('시작 동기화 지연 시간')
  .setDesc('레이아웃 준비 후 동기화 시작까지 대기 시간 (초)')
  .addSlider((slider) =>
    slider
      .setLimits(1, 30, 1)
      .setValue(this.plugin.settings.startupSyncDelay)
      .setDynamicTooltip()
      .onChange(async (value) => {
        this.plugin.settings.startupSyncDelay = value;
        await this.plugin.saveSettings();
      })
  );
```

---

## 기술 결정 요약

| 항목 | 결정 | 근거 |
|------|------|------|
| 레이아웃 준비 감지 | `workspace.onLayoutReady()` | 공식 API, 안정적 |
| 지연 타이머 | `window.setTimeout` | 기존 패턴과 일관성 |
| 폴백 타임아웃 | 30초 | 명세서 clarification 결과 |
| 최소 지연 시간 | 1초 | 안정성 보장 |
| 기본 지연 시간 | 3초 | 대부분 환경에서 적절 |
| 최대 지연 시간 | 30초 | 합리적인 상한선 |
| UI 컴포넌트 | SliderComponent | 직관적, 기존 UI 일관성 |

---

## 참고 자료

- [Obsidian API - Workspace.onLayoutReady](https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady)
- [Obsidian Plugin Development - Optimize plugin load time](https://docs.obsidian.md/Plugins/Guides/Optimize+plugin+load+time)
- 기존 코드: `src/main.ts` - 현재 시작 동기화 구현
