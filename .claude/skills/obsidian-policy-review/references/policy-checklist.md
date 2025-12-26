# Obsidian 개발자 정책 체크리스트

정책 문서: https://docs.obsidian.md/Developer+policies

## 금지 사항 (Prohibited)

위반 시 플러그인 거부/제거됨:

### 1. 코드 난독화
- [ ] 소스 코드가 읽기 쉬운 형태로 유지됨
- [ ] 빌드 설정에 난독화 플러그인 없음
- [ ] minify는 허용되나 obfuscate는 금지

**검색 패턴:**
```bash
# esbuild 설정 확인
grep -r "obfuscate\|uglify" esbuild.config.*
```

### 2. 동적 광고
- [ ] 인터넷에서 로드되는 광고 없음
- [ ] 외부 광고 네트워크 SDK 없음

**검색 패턴:**
```bash
grep -rn "adsense\|advert\|banner.*ad" src/
```

### 3. 정적 광고
- [ ] 플러그인 인터페이스 외부에 배너/메시지 없음
- [ ] 강제 팝업 없음

### 4. 클라이언트 측 텔레메트리
- [ ] 사용자 행동 추적 코드 없음
- [ ] 분석 SDK 없음 (Google Analytics, Mixpanel 등)

**검색 패턴:**
```bash
grep -rn "analytics\|tracking\|telemetry\|mixpanel\|amplitude" src/
```

### 5. 자동 업데이트
- [ ] 플러그인 자체 업데이트 메커니즘 없음
- [ ] Obsidian의 업데이트 시스템만 사용

**검색 패턴:**
```bash
grep -rn "auto.*update\|self.*update\|checkForUpdate" src/
```

### 6. 네트워크 자산 로드 (테마 전용)
- [ ] 테마는 외부에서 에셋 로드 금지

---

## 공개 필수 항목 (Disclosure Required)

README.md에 명확히 공개해야 함:

### 1. 원격 서비스 사용
- [ ] 외부 API 호출 여부 명시
- [ ] 어떤 데이터가 전송되는지 설명
- [ ] 서비스 제공자 명시

**검색 패턴:**
```bash
grep -rn "fetch\|axios\|request\|XMLHttpRequest" src/
grep -rn "api\.\|\.com\|\.io" src/
```

### 2. 계정 필요성
- [ ] API 키 필요 여부 명시
- [ ] 로그인/가입 필요 여부 명시
- [ ] 유료 서비스 여부 명시

**검색 패턴:**
```bash
grep -rn "apiKey\|api_key\|API_KEY\|token\|auth" src/
```

### 3. Vault 외부 파일 접근
- [ ] 시스템 경로 접근 여부 명시
- [ ] 접근하는 경로 목록 제공

**검색 패턴:**
```bash
grep -rn "require('fs')\|from 'fs'\|require('path')\|from 'path'\|os.homedir" src/
grep -rn "/usr/\|/opt/\|AppData\|Program Files" src/
```

### 4. 개인정보처리방침
- [ ] 서버로 데이터 전송 시 개인정보처리방침 링크 제공
- [ ] 데이터 저장 방식 설명

### 5. 플러그인 내 정적 광고
- [ ] 광고 포함 시 README에 명시

### 6. 서버 측 텔레메트리
- [ ] 서버에서 사용 통계 수집 시 명시
- [ ] 개인정보처리방침 링크 제공

### 7. 폐쇄형 소스 코드
- [ ] 폐쇄형 컴포넌트 있을 경우 명시

---

## 라이센스 요구사항

### LICENSE 파일
- [ ] 프로젝트 루트에 LICENSE 파일 존재
- [ ] 유효한 오픈소스 라이센스 사용 (MIT, GPL, Apache 등)

### 서드파티 라이센스
- [ ] 사용한 라이브러리의 라이센스 준수
- [ ] 필요시 라이센스 고지 포함

### Obsidian 상표
- [ ] "Obsidian" 이름 오용 없음
- [ ] 공식 플러그인으로 오해 유발하지 않음

---

## 보안 권고사항 (선택)

정책 위반은 아니나 권장됨:

### API 키 저장
- [ ] 가능하면 password 타입 입력 필드 사용
- [ ] 저장 방식에 대한 경고 표시

### 디버그 로깅
- [ ] 민감 정보가 콘솔에 출력되지 않도록 주의
- [ ] 디버그 모드는 기본 비활성화

### 권한 모드
- [ ] `bypassPermissions` 사용 시 사용자에게 경고
- [ ] 필요한 최소 권한만 요청
