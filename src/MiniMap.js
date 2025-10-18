import * as THREE from 'three';

export class MiniMap {
    constructor(scene, camera) {
        this.scene = scene;
        this.mainCamera = camera;
        this.minimapSize = 200;
        this.isVisible = false;
        this.minimapCamera = null;
        this.minimapRenderer = null;
        this.minimapScene = null;
        this.cameraMarker = null;
        this.setupMinimap();
    }

    setupMinimap() {
        // 미니맵 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'minimap-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: ${this.minimapSize}px;
            height: ${this.minimapSize}px;
            background: rgba(26, 26, 26, 0.9);
            border: 2px solid #0066cc;
            border-radius: 8px;
            overflow: hidden;
            display: none;
            z-index: 1000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;

        // 헤더
        const header = document.createElement('div');
        header.style.cssText = `
            background: #0066cc;
            color: white;
            padding: 5px 10px;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>미니맵</span>
            <button id="close-minimap" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 16px;
                padding: 0;
            ">×</button>
        `;

        // 캔버스
        const canvas = document.createElement('canvas');
        canvas.id = 'minimap-canvas';
        canvas.width = this.minimapSize;
        canvas.height = this.minimapSize - 30; // 헤더 높이 제외
        canvas.style.cssText = `
            display: block;
            cursor: pointer;
        `;

        container.appendChild(header);
        container.appendChild(canvas);
        document.body.appendChild(container);

        this.container = container;
        this.canvas = canvas;

        // 미니맵 씬 및 카메라 설정
        this.setupMinimapScene();

        // 이벤트 리스너
        header.querySelector('#close-minimap').addEventListener('click', () => this.hide());
        canvas.addEventListener('click', (e) => this.onMinimapClick(e));

        console.log('Minimap initialized');
    }

    setupMinimapScene() {
        // 미니맵용 별도 씬
        this.minimapScene = new THREE.Scene();
        this.minimapScene.background = new THREE.Color(0x1a1a1a);

        // 탑다운 카메라
        this.minimapCamera = new THREE.OrthographicCamera(
            -50, 50, 50, -50, 0.1, 1000
        );
        this.minimapCamera.position.set(0, 100, 0);
        this.minimapCamera.lookAt(0, 0, 0);

        // 미니맵용 렌더러
        this.minimapRenderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.minimapRenderer.setSize(this.minimapSize, this.minimapSize - 30);

        // 카메라 위치 마커
        const markerGeometry = new THREE.ConeGeometry(2, 4, 3);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.cameraMarker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.cameraMarker.rotation.x = Math.PI;
        this.minimapScene.add(this.cameraMarker);

        // 그리드
        const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
        this.minimapScene.add(gridHelper);
    }

    updateMinimap() {
        if (!this.isVisible) return;

        // 메인 카메라 위치를 미니맵에 반영
        this.minimapCamera.position.x = this.mainCamera.position.x;
        this.minimapCamera.position.z = this.mainCamera.position.z;

        // 카메라 마커 위치 업데이트
        this.cameraMarker.position.x = this.mainCamera.position.x;
        this.cameraMarker.position.z = this.mainCamera.position.z;

        // 카메라 방향 표시
        const direction = new THREE.Vector3();
        this.mainCamera.getWorldDirection(direction);
        const angle = Math.atan2(direction.x, direction.z);
        this.cameraMarker.rotation.y = -angle;

        // 미니맵 씬에 메인 씬의 객체 복사 (간략화된 버전)
        this.syncObjects();

        // 렌더링
        this.minimapRenderer.render(this.minimapScene, this.minimapCamera);
    }

    syncObjects() {
        // 이미 동기화된 객체 제외
        if (this.isSynced) return;

        // 메인 씬의 모든 mesh를 미니맵에 추가 (간단한 박스로 표현)
        this.scene.traverse((object) => {
            if (object.isMesh && object.userData.selectable) {
                // 바운딩 박스 기반 간략화된 표현
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // 작은 박스로 표현
                const geometry = new THREE.BoxGeometry(
                    Math.max(size.x, 0.5),
                    0.2,
                    Math.max(size.z, 0.5)
                );
                const material = new THREE.MeshBasicMaterial({
                    color: 0x666666,
                    transparent: true,
                    opacity: 0.7
                });
                const minimapObj = new THREE.Mesh(geometry, material);
                minimapObj.position.set(center.x, 0, center.z);

                this.minimapScene.add(minimapObj);
            }
        });

        this.isSynced = true;
    }

    onMinimapClick(event) {
        // 미니맵 클릭으로 카메라 이동
        const rect = this.canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 미니맵 좌표를 월드 좌표로 변환
        const worldX = x * 50;
        const worldZ = -y * 50;

        // 메인 카메라를 해당 위치로 이동 (Y는 유지)
        const targetPosition = new THREE.Vector3(
            worldX,
            this.mainCamera.position.y,
            worldZ
        );

        // 애니메이션으로 이동
        this.animateCameraTo(targetPosition);

        console.log('Minimap clicked, moving camera to:', worldX, worldZ);
    }

    animateCameraTo(targetPosition) {
        const startPosition = this.mainCamera.position.clone();
        const duration = 1000; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Ease-in-out 함수
            const easeT = t < 0.5
                ? 2 * t * t
                : -1 + (4 - 2 * t) * t;

            this.mainCamera.position.lerpVectors(startPosition, targetPosition, easeT);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    resetSync() {
        // 씬이 변경되었을 때 재동기화
        this.minimapScene.traverse((object) => {
            if (object.isMesh && object !== this.cameraMarker) {
                this.minimapScene.remove(object);
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            }
        });
        this.isSynced = false;
    }

    show() {
        this.container.style.display = 'block';
        this.isVisible = true;
        this.resetSync();
    }

    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    dispose() {
        if (this.minimapRenderer) {
            this.minimapRenderer.dispose();
        }
        if (this.container) {
            this.container.remove();
        }
    }
}
