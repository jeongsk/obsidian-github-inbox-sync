---
description: "GitHub Actions release.yml 워크플로우를 dispatch하여 플러그인 릴리스"
allowed-tools: Bash(gh:*)
argument-hint: "[patch|minor|major]"
---

GitHub Actions의 `release.yml` 워크플로우를 dispatch하여 Obsidian 플러그인을 릴리스합니다.

## 입력 파라미터

- `$ARGUMENTS`: 버전 타입 (patch, minor, major 중 하나, 기본값: patch)
- 버전 타입을 전달 받지 못하였다면, 커밋 기록을 분석하여 적절한 타입을 사용합니다.

## 수행 단계

1. **현재 상태 확인**
   - `git status`로 커밋되지 않은 변경사항이 있는지 확인
   - 변경사항이 있으면 먼저 커밋하도록 안내

2. **버전 타입 검증**
   - 입력된 버전 타입이 유효한지 확인 (patch, minor, major)
   - 유효하지 않으면 기본값 patch 사용

3. **워크플로우 dispatch**
   ```bash
   gh workflow run release.yml -f version_type=$ARGUMENTS
   ```

   인자가 없으면 기본값 patch 사용:
   ```bash
   gh workflow run release.yml -f version_type=patch
   ```

4. **실행 확인**
   - 워크플로우가 정상적으로 트리거되었는지 확인
   ```bash
   gh run list --workflow=release.yml --limit 1
   ```

5. **결과 안내**
   - 워크플로우 실행 상태와 URL 제공
   - GitHub Actions 페이지에서 진행 상황을 확인할 수 있도록 안내

## 주의사항

- GitHub CLI (`gh`)가 설치되어 있고 인증되어 있어야 합니다
- main 브랜치에 push 권한이 있어야 합니다
- 릴리스 전 모든 변경사항이 커밋되어 있어야 합니다
