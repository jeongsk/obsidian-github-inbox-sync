# Feature Specification: Startup Auto Sync

**Version**: 1.0.0
**Created**: 2025-12-28
**Status**: Draft
**Feature ID**: 2-startup-auto-sync

---

## Clarifications

### Session 2025-12-28

- Q: 수동 동기화와 시작 동기화 충돌 시 처리 방식? → A: 수동 동기화 실행 후 시작 동기화 완전 취소
- Q: 지연 시간 최소값은? → A: 최소 1초 (안정성을 위한 최소 지연 보장)
- Q: layout-ready 미발생 시 폴백 타임아웃? → A: 30초 (균형잡힌 대기 시간)

---

## Overview

### Problem Statement

현재 플러그인은 Obsidian 시작 시 2초 고정 지연 후 동기화를 실행합니다. 이 접근 방식에는 다음과 같은 문제가 있습니다:

- Obsidian의 초기화 상태와 무관하게 고정된 시간 후 동기화 시작
- 무거운 vault나 느린 시스템에서 성능 저하 발생 가능
- 사용자가 시작 시 자동 동기화를 비활성화하더라도 UI에서 명확히 구분되지 않음
- 시작 시 여러 플러그인이 동시에 작업할 때 리소스 경쟁 발생 가능

### Solution Summary

Obsidian의 레이아웃이 완전히 준비된 후 자동 동기화를 실행하도록 개선합니다. 사용자는 설정에서 시작 시 자동 동기화 기능을 on/off 할 수 있으며, 동기화 시작 전 추가 지연 시간을 설정할 수 있습니다. 이를 통해 Obsidian 성능을 저해하지 않으면서 안정적인 자동 동기화를 제공합니다.

### Target Users

| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| 일반 사용자 | Obsidian을 열 때마다 최신 노트를 원하는 사용자 | 시작 시 자동으로 새 노트 동기화 |
| 성능 중시 사용자 | 대용량 vault를 사용하며 빠른 시작을 원하는 사용자 | 시작 시 동기화 비활성화 옵션 |
| 모바일 사용자 | 제한된 리소스 환경에서 사용하는 사용자 | 시스템 부하를 최소화하는 지연 동기화 |

---

## User Scenarios & Testing

### Primary User Flow

**Scenario 1: 시작 시 자동 동기화 활성화 상태로 Obsidian 실행**

1. 사용자가 설정에서 "시작 시 자동 동기화"를 활성화함
2. 사용자가 Obsidian을 실행함
3. Obsidian UI가 완전히 로드됨
4. 설정된 지연 시간 후 플러그인이 자동으로 동기화 시작
5. 동기화 완료 후 알림 표시 (알림 설정이 켜진 경우)

**Acceptance Criteria:**
- Obsidian 레이아웃이 준비되기 전에는 동기화가 시작되지 않음
- 설정된 지연 시간이 정확히 적용됨
- 동기화 중 UI가 멈추거나 끊기지 않음
- 사용자가 수동 동기화를 하더라도 시작 동기화와 충돌하지 않음

### Secondary User Flows

**Scenario 2: 시작 시 자동 동기화 비활성화**

1. 사용자가 설정에서 "시작 시 자동 동기화"를 비활성화함
2. 사용자가 Obsidian을 실행함
3. 플러그인은 자동 동기화를 수행하지 않음
4. 사용자는 필요할 때 수동으로 동기화 가능

**Acceptance Criteria:**
- 시작 시 동기화가 전혀 실행되지 않음
- 주기적 자동 동기화 설정과 독립적으로 동작
- 설정 변경이 즉시 반영됨

**Scenario 3: 시작 지연 시간 설정**

1. 사용자가 설정에서 시작 동기화 지연 시간을 조정함 (예: 5초)
2. 사용자가 Obsidian을 실행함
3. Obsidian 레이아웃 준비 완료 후 5초 대기
4. 동기화 시작

**Acceptance Criteria:**
- 지연 시간은 1초에서 30초 사이로 설정 가능
- 기본값은 3초
- 최소 1초 지연으로 다른 플러그인 초기화와의 경쟁 방지

**Scenario 4: 대용량 vault에서의 안정적 동작**

1. 사용자가 1000개 이상의 파일이 있는 vault를 사용
2. Obsidian 시작 시 여러 플러그인이 동시에 로드됨
3. 플러그인은 레이아웃 준비 및 지연 시간 후에만 동기화 시작
4. 다른 플러그인 작업과 경쟁하지 않음

**Acceptance Criteria:**
- vault 크기에 관계없이 Obsidian 시작 성능에 영향 없음
- 동기화는 백그라운드에서 비동기적으로 수행
- 메인 스레드를 차단하지 않음

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| 설정 없이 처음 플러그인 로드 | 기본값으로 시작 동기화 활성화, 3초 지연 |
| 지연 시간 중 Obsidian 종료 | 동기화 취소, 다음 시작 시 다시 시도 |
| 지연 시간 중 수동 동기화 요청 | 수동 동기화 실행, 시작 동기화 취소 |
| GitHub 토큰 미설정 상태 | 시작 동기화 건너뛰기, 경고 없음 |
| 네트워크 연결 없음 | 동기화 실패 처리, 오류 알림 표시 |
| 모바일 환경 (Obsidian Mobile) | 데스크톱과 동일하게 동작 |
| layout-ready 이벤트 30초 내 미발생 | 폴백으로 동기화 시작 |

---

## Functional Requirements

### 설정 관리

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-001 | 시작 시 자동 동기화 on/off 토글 제공 | 설정 UI에서 명확한 토글 스위치로 표시 |
| FR-002 | 시작 동기화 지연 시간 설정 제공 | 1-30초 범위의 슬라이더 또는 숫자 입력 |
| FR-003 | 설정 변경 시 즉시 반영 | 다음 시작부터 적용, 현재 예약된 동기화에는 영향 없음 |
| FR-004 | 기본값 제공 | 시작 동기화: 활성화, 지연 시간: 3초 |

### 동기화 실행

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-101 | Obsidian 레이아웃 준비 후 동기화 시작 | workspace 'layout-ready' 이벤트 사용 |
| FR-102 | 설정된 지연 시간 후 동기화 실행 | 레이아웃 준비 + 지연 시간 경과 후 실행 |
| FR-103 | 동기화 취소 가능 | 플러그인 비활성화 또는 수동 동기화 시 취소 |
| FR-104 | 동기화 중복 방지 | 이미 동기화 중이면 시작 동기화 건너뛰기 |
| FR-105 | layout-ready 폴백 타임아웃 | 30초 내 이벤트 미발생 시 폴백으로 동기화 시작 |

### 성능 최적화

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FR-201 | 비동기 동기화 실행 | 메인 스레드 차단 없음 |
| FR-202 | 메모리 효율적 처리 | 대용량 vault에서도 메모리 급증 없음 |
| FR-203 | 타임아웃 처리 | 지연된 동기화가 무한 대기하지 않음 |

---

## Success Criteria

| Criterion | Target | Measurement Method |
|-----------|--------|-------------------|
| 시작 성능 영향 | Obsidian 시작 시간 증가 0.5초 미만 | 플러그인 유무 비교 측정 |
| 사용자 제어 | 100%의 사용자가 시작 동기화를 활성화/비활성화 가능 | 설정 UI 테스트 |
| 안정성 | 100회 시작 중 동기화 실패 0회 (네트워크 문제 제외) | 반복 테스트 |
| UI 반응성 | 동기화 중 UI 멈춤 0회 | 사용자 상호작용 테스트 |
| 리소스 사용 | 동기화 중 CPU 사용률 10% 미만 유지 | 성능 모니터링 |

---

## Key Entities

### GitHubInboxSyncSettings (기존 확장)

시작 동기화 관련 설정 추가

| Attribute | Description |
|-----------|-------------|
| syncOnStartup | 시작 시 자동 동기화 활성화 여부 (기존) |
| startupSyncDelay | 레이아웃 준비 후 동기화 시작까지 지연 시간 (초) |

### StartupSyncState

시작 동기화 상태 관리 (런타임 전용)

| Attribute | Description |
|-----------|-------------|
| isScheduled | 시작 동기화가 예약되었는지 여부 |
| timeoutId | 지연 타이머 ID (취소용) |
| startedAt | 시작 동기화 예약 시간 |

---

## Scope & Boundaries

### In Scope

- 시작 시 자동 동기화 on/off 설정
- 동기화 시작 지연 시간 설정
- Obsidian 레이아웃 준비 이벤트 감지
- 동기화 취소 메커니즘
- 설정 UI 업데이트

### Out of Scope

- 동기화 로직 자체의 변경
- 새로운 동기화 트리거 추가
- 동기화 진행률 표시
- 시작 동기화 히스토리 별도 관리
- 조건부 시작 동기화 (예: 네트워크 상태 확인 후 동기화)

---

## Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| Obsidian Workspace API | Platform | 'layout-ready' 이벤트 사용 |
| 기존 SyncService | Internal | 동기화 로직 재사용 |
| 기존 Settings 구조 | Internal | 설정 확장 |

---

## Assumptions

1. Obsidian의 'layout-ready' 이벤트는 모든 플랫폼에서 안정적으로 발생한다
2. 기존 syncOnStartup 설정을 확장하여 사용한다
3. 지연 시간의 기본값 3초는 대부분의 환경에서 적절하다
4. 사용자는 시작 동기화와 주기적 자동 동기화의 차이를 이해한다
5. 모바일 환경에서도 동일한 방식으로 동작한다

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| layout-ready 이벤트 미발생 | Low | High | 30초 타임아웃 폴백 메커니즘 구현 |
| 지연 시간 중 Obsidian 종료 | Medium | Low | 정상적인 취소 처리 |
| 다른 플러그인과의 타이밍 충돌 | Low | Medium | 충분한 기본 지연 시간 설정 |
| 모바일에서 다른 동작 | Low | Medium | 플랫폼별 테스트 |

---
