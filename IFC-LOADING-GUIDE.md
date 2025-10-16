# IFC 파일 로딩 가이드

## 🎯 메모리 최적화 완료!

"Out of Memory" 오류를 해결했습니다. 이제 IFC 파일을 안전하게 로드할 수 있습니다.

## ✅ 해결된 문제들

1. **메모리 부족 오류** - 최적화된 로딩 방식 적용
2. **무한 대기** - 프로그레스 바로 진행상황 확인 가능
3. **WASM 파일 오류** - 자동 경로 설정

## 📂 추천 테스트 파일

### 1. 초보자용 (작은 파일부터 시작)

가장 작은 파일부터 테스트해보세요:

```
Sample-Test-Files-main/IFC 4.0.2.1 (IFC 4)/ISO Spec - ReferenceView_V1.2/
├── tessellation-with-individual-colors.ifc (2.6 KB) ⭐ 추천!
├── column-straight-rectangle-tessellation.ifc (4.5 KB)
├── tessellated-item.ifc (5.1 KB)
├── basin-tessellation.ifc (12 KB)
└── wall-with-opening-and-window.ifc (13 KB)
```

### 2. 중급자용 (중간 크기)

```
Sample-Test-Files-main/IFC 4.0.2.1 (IFC 4)/PCERT-Sample-Scene/
├── Building-Hvac.ifc (176 KB)
├── Building-Architecture.ifc (224 KB)
└── Building-Structural.ifc
```

### 3. 고급자용 (대용량)

100MB 이상 파일은 경고 메시지가 표시됩니다.

## 🚀 사용 방법

### 1단계: 서버 접속

브라우저에서 다음 중 하나를 열기:

- 기본 버전: **http://localhost:3001**
- 고급 버전: **http://localhost:3001/index-advanced.html** (추천)

### 2단계: IFC 파일 선택

1. "IFC 파일 열기" 버튼 클릭
2. 가장 작은 파일부터 선택 (tessellation-with-individual-colors.ifc)
3. 로딩 진행률 확인

### 3단계: 로딩 진행 확인

화면에 표시되는 메시지:
```
초기화 중... 0%
  ↓
로딩 중... 50%
  ↓
로딩 중... 100%
  ↓
모델 처리 중...
  ↓
완료!
```

### 4단계: 브라우저 콘솔 확인 (F12)

정상적으로 로드되면 다음 메시지가 표시됩니다:
```
✓ IFC Loader initialized successfully
✓ IFC file parsed successfully
✓ IFC model loaded and processed
IFC Model loaded: {
  meshes: 10,
  triangles: 1234,
  size: "10.0 × 5.0 × 3.0"
}
```

## ⚠️ 오류 해결

### "Out of Memory" 발생 시

**원인**: 파일이 너무 크거나 브라우저 메모리 부족

**해결책**:
1. 더 작은 파일로 테스트 (< 10MB)
2. 브라우저 재시작
3. 다른 탭 모두 닫기
4. Chrome/Edge 사용 (메모리 관리가 더 좋음)

### "파일을 찾을 수 없습니다" 오류

**해결책**:
1. 페이지 새로고침 (Ctrl + F5)
2. public 폴더에 WASM 파일 확인:
   ```bash
   ls public/
   # web-ifc.wasm, web-ifc-mt.wasm, web-ifc-node.wasm 있어야 함
   ```

### 무한 로딩 (진행률이 멈춤)

**해결책**:
1. 브라우저 콘솔 (F12) 열어서 오류 확인
2. 5분 이상 기다렸다면 페이지 새로고침
3. 더 작은 파일로 시도

## 📊 파일 크기별 예상 로딩 시간

| 파일 크기 | 예상 시간 | 권장사항 |
|-----------|-----------|----------|
| < 1 MB | 1-5초 | ✅ 매우 빠름 |
| 1-10 MB | 5-30초 | ✅ 정상 |
| 10-50 MB | 30초-2분 | ⚠️ 느릴 수 있음 |
| 50-100 MB | 2-5분 | ⚠️ 많이 느림 |
| > 100 MB | 5분+ | ❌ 권장하지 않음 |

## 💡 최적 사용 팁

### 1. 작은 파일부터 시작
```
1. tessellation-with-individual-colors.ifc (2.6KB) 테스트
2. 성공하면 wall-with-opening-and-window.ifc (13KB) 시도
3. 그 다음 Building-Hvac.ifc (176KB)
```

### 2. 브라우저 메모리 정리
```
1. 다른 탭 모두 닫기
2. Chrome 작업 관리자 (Shift + Esc)로 메모리 사용량 확인
3. 필요시 브라우저 재시작
```

### 3. 고급 버전 사용
```
index-advanced.html 사용 시:
- 객체 탐색기로 분류 확인
- 무거운 카테고리는 숨기기
- 필요한 부분만 표시하여 성능 향상
```

## 🔍 콘솔 메시지 해석

### 정상 로딩
```
Initializing IFC Loader...
✓ IFC Loader initialized successfully
Loading IFC file: building.ifc (224 KB)
Starting IFC parse...
Loading: 25%
Loading: 50%
Loading: 75%
✓ IFC file parsed successfully
Processing IFC model...
✓ IFC model loaded and processed
```

### 메모리 부족
```
✗ IFC Load error: RangeError: Array buffer allocation failed
메모리 부족: 파일이 너무 큽니다. 더 작은 파일을 시도하거나 브라우저를 재시작하세요.
```

### WASM 오류
```
✗ Failed to initialize IFC loader: TypeError: Cannot read...
WASM 파일을 찾을 수 없습니다. 페이지를 새로고침하세요.
```

## 🎮 로딩 후 사용법

### 기본 조작
- **마우스 왼쪽**: 회전
- **마우스 휠**: 줌
- **마우스 오른쪽**: 이동
- **객체 클릭**: 선택 및 정보 표시

### 고급 기능 (index-advanced.html)
- **탐색기**: 좌측 사이드바에서 객체 검색
- **카테고리**: Walls, Doors 등으로 필터링
- **측정**: 거리, 면적, 부피 계산
- **단면**: X, Y, Z 축으로 절단
- **주석**: 3D 공간에 메모 추가

## 📞 추가 도움이 필요한 경우

1. **브라우저 콘솔 로그** (F12) 복사
2. **사용한 IFC 파일 이름** 확인
3. **파일 크기** 확인
4. **브라우저 종류 및 버전** 확인

## ⚡ 성능 개선 체크리스트

- [ ] 작은 파일 (< 10MB)부터 테스트
- [ ] Chrome 또는 Edge 사용
- [ ] 다른 탭 닫기
- [ ] 브라우저 콘솔에서 에러 확인
- [ ] 페이지 새로고침 (Ctrl + F5)
- [ ] 필요시 브라우저 재시작
- [ ] 고급 버전에서 불필요한 객체 숨기기

---

**성공적인 IFC 뷰어 사용을 기원합니다! 🎉**
