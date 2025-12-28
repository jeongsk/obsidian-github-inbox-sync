# Internal API Contract: Startup Sync

**Feature**: 2-startup-auto-sync
**Date**: 2025-12-28

---

## 개요

시작 동기화 기능의 내부 API 계약을 정의합니다. 이 기능은 외부 API를 노출하지 않으며, 플러그인 내부에서만 사용됩니다.

---

## 메서드 계약

### scheduleStartupSync

시작 동기화를 예약합니다.

```typescript
/**
 * 시작 동기화를 예약합니다.
 * 설정된 지연 시간 후에 동기화가 실행됩니다.
 *
 * @precondition settings.syncOnStartup === true
 * @precondition settings.githubToken이 설정되어 있어야 함
 * @precondition settings.repository가 설정되어 있어야 함
 * @postcondition startupSyncState.isScheduled === true
 * @postcondition startupSyncState.timeoutId !== null
 */
private scheduleStartupSync(): void;
```

**동작**:
1. 이미 동기화가 예약되었거나 실행된 경우 무시
2. 설정된 지연 시간(초)을 밀리초로 변환
3. `window.setTimeout`으로 타이머 설정
4. 타이머 ID를 상태에 저장

---

### cancelStartupSync

예약된 시작 동기화를 취소합니다.

```typescript
/**
 * 예약된 시작 동기화를 취소합니다.
 *
 * @postcondition startupSyncState.isScheduled === false
 * @postcondition startupSyncState.timeoutId === null
 */
private cancelStartupSync(): void;
```

**동작**:
1. 타이머 ID가 있으면 `window.clearTimeout` 호출
2. 폴백 타이머 ID가 있으면 `window.clearTimeout` 호출
3. 상태 초기화

---

### initStartupSync

시작 동기화 초기화 (onload에서 호출)

```typescript
/**
 * 시작 동기화를 초기화합니다.
 * workspace.onLayoutReady 이벤트를 등록하고 폴백 타이머를 설정합니다.
 *
 * @precondition 플러그인이 로드되는 중
 * @postcondition onLayoutReady 콜백이 등록됨
 * @postcondition 폴백 타이머가 설정됨 (30초)
 */
private initStartupSync(): void;
```

**동작**:
1. `syncOnStartup` 설정 확인
2. GitHub 토큰과 저장소 설정 확인
3. 폴백 타이머 설정 (30초)
4. `workspace.onLayoutReady` 콜백 등록
5. 콜백 내에서 폴백 타이머 취소 및 `scheduleStartupSync` 호출

---

## 이벤트 흐름

### 정상 흐름

```
Plugin.onload()
    │
    ├── initStartupSync() 호출
    │       │
    │       ├── 폴백 타이머 설정 (30초)
    │       │
    │       └── workspace.onLayoutReady() 등록
    │
    └── 기타 초기화...

... (Obsidian 레이아웃 준비 중) ...

workspace.onLayoutReady 콜백 실행
    │
    ├── 폴백 타이머 취소
    │
    └── scheduleStartupSync() 호출
            │
            └── 지연 타이머 설정 (1-30초)

... (지연 시간 경과) ...

타이머 콜백 실행
    │
    └── performSync('startup') 호출
```

### 수동 동기화로 인한 취소 흐름

```
지연 타이머 대기 중...
    │
사용자가 수동 동기화 요청
    │
    ├── cancelStartupSync() 호출
    │       │
    │       └── 지연 타이머 취소
    │
    └── performSync('manual') 실행
```

### 폴백 흐름 (layout-ready 미발생)

```
Plugin.onload()
    │
    └── initStartupSync() 호출
            │
            └── 폴백 타이머 설정 (30초)

... (30초 경과, onLayoutReady 미발생) ...

폴백 타이머 콜백 실행
    │
    └── scheduleStartupSync() 호출
            │
            └── 지연 타이머 설정
```

---

## 상태 전이 규칙

| 현재 상태 | 이벤트 | 다음 상태 | 동작 |
|-----------|--------|-----------|------|
| idle | initStartupSync | waiting_layout | 폴백 타이머 설정, onLayoutReady 등록 |
| waiting_layout | onLayoutReady | scheduled | 폴백 취소, 지연 타이머 설정 |
| waiting_layout | 폴백 타임아웃 | scheduled | 지연 타이머 설정 |
| scheduled | 지연 타임아웃 | executed | performSync 호출 |
| scheduled | 수동 동기화 | cancelled | 지연 타이머 취소 |
| scheduled | 플러그인 언로드 | cancelled | 타이머 취소 |

---

## 에러 처리

| 에러 상황 | 처리 방법 |
|-----------|-----------|
| GitHub 토큰 미설정 | 시작 동기화 건너뛰기 (경고 없음) |
| 저장소 미설정 | 시작 동기화 건너뛰기 (경고 없음) |
| 동기화 중 에러 | 기존 에러 처리 로직 사용 |
| 타이머 취소 실패 | 무시 (이미 실행됨) |

---

## 설정 UI 계약

### 시작 동기화 지연 시간 설정

```typescript
/**
 * 설정 UI에서 지연 시간을 변경합니다.
 *
 * @param value 새 지연 시간 (초)
 * @precondition 1 <= value <= 30
 * @postcondition settings.startupSyncDelay === value
 * @effect 다음 Obsidian 시작부터 적용
 */
async onStartupSyncDelayChange(value: number): Promise<void>;
```

**UI 요구사항**:
- SliderComponent 사용
- 범위: 1-30
- 스텝: 1
- 동적 툴팁 표시
- `syncOnStartup`이 비활성화된 경우 비활성화 상태로 표시
