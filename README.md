# BIM 3D Viewer

Dalux와 유사한 기능을 제공하는 BIM 3D 뷰어 프로그램입니다.

## 주요 기능

### 1. IFC 파일 로딩
- IFC (Industry Foundation Classes) 파일 형식 지원
- 드래그 앤 드롭 또는 파일 선택으로 로딩
- 자동 중심 정렬 및 최적화

### 2. 3D 뷰어 기능
- **카메라 컨트롤**
  - 마우스로 회전, 줌, 팬
  - 키보드 단축키 (W/S/A/D/Q/E)
  - 카메라 리셋 버튼

- **객체 선택 및 정보 표시**
  - 클릭으로 객체 선택
  - 선택된 객체 하이라이트
  - 사이드바에 객체 속성 표시 (위치, 회전, 스케일 등)

- **측정 도구**
  - 두 점 사이의 거리 측정
  - 실시간 프리뷰
  - 측정값 라벨 표시

- **단면 뷰**
  - X, Y, Z 축 기준 단면 절단
  - 슬라이더로 실시간 조절
  - 다중 평면 동시 적용 가능

- **와이어프레임 모드**
  - 전체 모델 와이어프레임 토글
  - 구조 확인에 유용

### 3. UI 구성
- **툴바**: 주요 기능 버튼
- **사이드바**: 객체 정보 패널
- **뷰포트**: 3D 렌더링 영역
- **정보 패널**: FPS, 삼각형 수, 객체 수 표시

## 설치 방법

1. 의존성 설치:
```bash
npm install
```

2. 개발 서버 실행:
```bash
npm run dev
```

3. 브라우저에서 자동으로 열립니다 (http://localhost:3000)

## 빌드

프로덕션 빌드:
```bash
npm run build
```

빌드 미리보기:
```bash
npm run preview
```

## 사용 방법

### IFC 파일 열기
1. 상단 툴바에서 "IFC 파일 열기" 버튼 클릭
2. IFC 파일 선택
3. 로딩 완료 후 3D 모델 표시

### 카메라 조작
- **마우스 왼쪽 버튼**: 회전
- **마우스 휠**: 줌 인/아웃
- **마우스 오른쪽 버튼**: 팬 (이동)
- **키보드**:
  - W/S: 앞/뒤 이동
  - A/D: 좌/우 이동
  - Q/E: 위/아래 이동
  - R: 카메라 리셋
  - ESC: 선택 해제 / 도구 종료

### 객체 선택
- 3D 모델의 객체를 클릭하면 하이라이트되고 오른쪽 사이드바에 정보 표시

### 측정하기
1. "측정" 버튼 클릭
2. 첫 번째 점 클릭
3. 두 번째 점 클릭
4. 거리가 자동으로 표시됨

### 단면 보기
1. "단면" 버튼 클릭
2. 화면 왼쪽 하단의 슬라이더로 각 축의 절단 위치 조절
3. X, Y, Z 축을 독립적으로 조절 가능

## 기술 스택

- **Three.js**: 3D 렌더링 엔진
- **web-ifc**: IFC 파일 파싱
- **web-ifc-three**: IFC와 Three.js 통합
- **Vite**: 빌드 도구
- **OrbitControls**: 카메라 컨트롤

## 시스템 요구사항

- 최신 웹 브라우저 (Chrome, Firefox, Edge, Safari)
- WebGL 2.0 지원
- 중간 이상의 GPU 권장

## 구현된 고급 기능

- [x] 다중 IFC 파일 동시 로딩 (Model Manager)
- [x] 객체 필터링 및 검색 (Object Explorer)
- [x] 레이어 관리 (Category Management)
- [x] 주석 및 마크업 (Annotation Tool)
- [x] 스크린샷 및 내보내기 (Screenshot Tool)
- [x] 충돌 감지 (Collision Detector)
- [x] 애니메이션 경로 (Camera Path Animator)
- [x] 뷰포인트 관리 (Viewpoint Manager)
- [x] 미니맵 네비게이션 (Mini Map)
- [x] PDF 리포트 생성 (PDF Report Generator)
- [x] BCF 이슈 관리 (BCF Manager)
- [x] 4D 공정 시뮬레이션 (Timeline Simulator)
- [x] 성능 모니터링 (Performance Monitor)

## 향후 개발 계획

- [ ] VR/AR 모드 지원
- [ ] 클라우드 저장 (Firebase)
- [ ] 실시간 협업 (WebSocket)
- [ ] 5D BIM (비용 정보 통합)
- [ ] AI 기반 문제 감지
- [ ] 모바일 최적화

## 라이선스

MIT License
