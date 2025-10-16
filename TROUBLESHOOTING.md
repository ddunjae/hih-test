# 문제 해결 가이드

## IFC 파일 로딩 오류

### 증상
IFC 파일을 열 때 오류가 발생합니다.

### 해결 방법

#### 1. WASM 파일 확인
```bash
# public 폴더에 WASM 파일이 있는지 확인
ls public/

# 없다면 복사
cp node_modules/web-ifc/*.wasm public/
```

#### 2. 브라우저 콘솔 확인
- 브라우저 개발자 도구 (F12) 열기
- Console 탭에서 오류 메시지 확인
- "IFC Loader initialized successfully" 메시지가 보이는지 확인

#### 3. 서버 재시작
```bash
# 개발 서버 중지 후 재시작
npm run dev
```

#### 4. 캐시 클리어
- 브라우저 캐시 삭제 (Ctrl + Shift + Delete)
- 하드 리프레시 (Ctrl + F5)

### 일반적인 오류들

#### "Failed to initialize IFC loader"
- `web-ifc-three` 패키지가 제대로 설치되지 않음
- 해결: `npm install` 재실행

#### "WASM file not found"
- WASM 파일이 public 폴더에 없음
- 해결: 위의 1번 단계 실행

#### "Cannot read properties of undefined"
- IFC 파일 형식이 잘못됨 또는 손상됨
- 해결: 다른 IFC 파일로 테스트

### 테스트용 IFC 파일

프로젝트에 포함된 샘플 파일 사용:
```
Sample-Test-Files-main/IFC 4.0.2.1 (IFC 4)/PCERT-Sample-Scene/Building-Architecture.ifc
```

### 추가 도움말

#### 작은 파일로 먼저 테스트
대용량 파일보다 작은 파일(< 10MB)로 먼저 테스트해보세요.

#### 지원되는 IFC 버전
- IFC 2x3
- IFC 4
- IFC 4.3

#### 브라우저 호환성
권장 브라우저:
- Chrome 90+
- Edge 90+
- Firefox 88+

Safari는 일부 기능이 제한될 수 있습니다.

## 성능 문제

### 느린 로딩
- 파일 크기가 큰 경우 정상입니다
- 로딩 진행률이 콘솔에 표시됩니다

### 낮은 FPS
- 복잡한 모델의 경우 정상입니다
- 와이어프레임 모드로 전환하면 성능 향상
- 일부 객체를 숨겨서 성능 개선

## 기타 문제

### 포트가 사용 중
```
Port 3000 is in use, trying another one...
```
- 다른 포트(3001 등)가 자동으로 선택됩니다
- 또는 3000 포트를 사용 중인 프로세스를 종료하세요

### 모듈을 찾을 수 없음
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
npm install
```

## 도움이 더 필요하신가요?

1. 브라우저 콘솔의 전체 오류 메시지 확인
2. 사용 중인 IFC 파일 정보 확인
3. 시스템 정보 (OS, 브라우저 버전) 확인
4. GitHub 이슈 등록

## 현재 실행 중인 서버

서버가 다음 주소에서 실행 중입니다:
- 기본: http://localhost:3001
- 고급: http://localhost:3001/index-advanced.html
