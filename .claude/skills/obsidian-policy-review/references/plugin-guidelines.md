# Obsidian Plugin Development Guidelines

플러그인 코드 품질, 보안, 성능, UI/UX 가이드라인 체크리스트.

## 1. 보안 (Security)

### DOM 구성 방식

| 검사 항목 | 검색 패턴 | 권장 수정 |
|-----------|-----------|-----------|
| innerHTML 사용 | `innerHTML\s*=` | `createEl()`, `createDiv()` 사용 |
| outerHTML 사용 | `outerHTML\s*=` | `createEl()` 사용 |
| insertAdjacentHTML | `insertAdjacentHTML` | `createEl()` + `appendChild()` 사용 |
| document.write | `document\.write` | `createEl()` 사용 |

**위험**: 사용자 입력을 포함한 문자열로 DOM을 구성하면 XSS 공격 가능

**권장 패턴**:
```typescript
// Bad
container.innerHTML = `<div>${userInput}</div>`;

// Good
const div = container.createDiv();
div.setText(userInput);
```

## 2. 성능 (Performance)

### 파일 조회 방식

| 검사 항목 | 안티패턴 | 권장 방식 |
|-----------|----------|-----------|
| 모든 파일 순회 | `vault.getFiles().forEach` | `vault.getFileByPath()` |
| 모든 폴더 순회 | `vault.getAllFolders` | `vault.getFolderByPath()` |
| 파일 존재 확인 | `vault.getFiles().find` | `vault.getAbstractFileByPath()` |

### API 선택

| 검사 항목 | 안티패턴 | 권장 방식 |
|-----------|----------|-----------|
| 파일 읽기 | `app.vault.adapter.read` | `app.vault.read()` (캐싱 지원) |
| 파일 쓰기 | `app.vault.adapter.write` | `app.vault.modify()` |
| 파일 수정 | 전체 파일 읽기/쓰기 | `vault.process()` (원자적) |
| Frontmatter 수정 | 직접 YAML 파싱 | `fileManager.processFrontMatter()` |

### Editor API 사용

활성 파일 수정 시 Editor API 사용 (커서 위치 보존):
```typescript
// Bad
await this.app.vault.modify(file, newContent);

// Good (활성 파일인 경우)
editor.replaceRange(newText, from, to);
```

## 3. UI/UX

### 텍스트 서식

| 검사 항목 | 안티패턴 | 권장 방식 |
|-----------|----------|-----------|
| 제목 대소문자 | "Template Folder Location" | "Template folder location" (Sentence case) |
| 설정 제목 | "Advanced settings" | "Advanced" ("settings" 제외) |
| 제목 태그 사용 | `<h1>`, `<h2>` | `Setting.setHeading()` |

### Setting API 사용

```typescript
// Bad
containerEl.createEl('h2', { text: 'Settings' });

// Good
new Setting(containerEl).setHeading().setName('Settings');
```

## 4. 코드 품질

### 리소스 관리

| 검사 항목 | 검색 패턴 | 권장 방식 |
|-----------|-----------|-----------|
| 이벤트 리스너 | `addEventListener` | `registerDomEvent()` (자동 정리) |
| 이벤트 등록 | `workspace.on` | `registerEvent()` (자동 정리) |
| 인터벌 | `setInterval` | `registerInterval()` (자동 정리) |
| 커맨드 | `addCommand` | 자동 정리됨 |

**언로드 시 정리 필수**:
```typescript
onunload() {
  // registerEvent, registerDomEvent, registerInterval 사용 시 자동 정리
  // 수동 등록한 리스너는 명시적 제거 필요
}
```

### TypeScript 권장 사항

| 검사 항목 | 안티패턴 | 권장 방식 |
|-----------|----------|-----------|
| 변수 선언 | `var` | `const`, `let` |
| Promise 처리 | `.then().catch()` | `async/await` |
| 전역 app 참조 | `app` 또는 `window.app` | `this.app` |

### 검색 패턴

```
var\s+\w+\s*=          # var 사용 감지
\.then\s*\(            # Promise chain 감지
[^this\.]app\.         # 전역 app 참조 감지 (주의: 오탐 가능)
window\.app            # 명시적 전역 app 참조
```

## 5. 모바일 호환성

### Node.js/Electron API

| 검사 항목 | 검색 패턴 | 대안 |
|-----------|-----------|------|
| Node.js fs | `require\(['"]fs['"]\)`, `from ['"]fs['"]` | Vault API |
| Node.js path | `require\(['"]path['"]\)` | `normalizePath()` |
| Node.js os | `require\(['"]os['"]\)` | 플랫폼 독립적 코드 |
| Electron API | `require\(['"]electron['"]\)` | Obsidian API |
| child_process | `require\(['"]child_process['"]\)` | 불가 (데스크톱 전용 명시) |

### 정규식 호환성

| 검사 항목 | 안티패턴 | 권장 방식 |
|-----------|----------|-----------|
| Lookbehind | `(?<=...)`, `(?<!...)` | 폴백 구현 (iOS 16.4+ 전용) |

**모바일 미지원 시**: `manifest.json`에 `"isDesktopOnly": true` 설정

## 6. 스타일링

### CSS 클래스 기반

| 검사 항목 | 안티패턴 | 권장 방식 |
|-----------|----------|-----------|
| 인라인 스타일 | `style="..."` | CSS 클래스 사용 |
| 하드코딩 색상 | `color: #fff` | CSS 변수 사용 |

### Obsidian CSS 변수

```css
/* Bad */
.my-plugin {
  background: #ffffff;
  color: #000000;
}

/* Good */
.my-plugin {
  background: var(--background-primary);
  color: var(--text-normal);
}
```

**주요 CSS 변수**:
- `--background-primary`, `--background-secondary`
- `--text-normal`, `--text-muted`, `--text-faint`
- `--interactive-accent`, `--interactive-hover`
- `--background-modifier-error`, `--background-modifier-success`

## 검사 스크립트 예시

```bash
# 보안 검사
grep -rn "innerHTML\s*=" src/
grep -rn "outerHTML\s*=" src/
grep -rn "insertAdjacentHTML" src/

# 성능 검사
grep -rn "vault.adapter" src/
grep -rn "getFiles().forEach" src/

# 코드 품질 검사
grep -rn "^var\s" src/
grep -rn "window.app" src/

# 모바일 호환성 검사
grep -rn "require.*fs" src/
grep -rn "require.*electron" src/
grep -rn "(?<=" src/  # lookbehind 검사
```
