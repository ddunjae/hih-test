import * as THREE from 'three';

export class ViewpointManager {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        this.viewpoints = [];
        this.currentIndex = -1;
        this.loadViewpoints();
        this.setupUI();
    }

    setupUI() {
        const saveBtn = document.getElementById('save-viewpoint-btn');
        const listContainer = document.getElementById('viewpoints-list');

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentViewpoint());
        }

        this.updateViewpointList();
    }

    saveCurrentViewpoint() {
        const name = prompt('뷰포인트 이름을 입력하세요:', `View ${this.viewpoints.length + 1}`);
        if (!name) return;

        const viewpoint = {
            id: Date.now(),
            name,
            position: this.camera.position.clone(),
            target: this.controls.target.clone(),
            zoom: this.camera.zoom,
            timestamp: new Date().toISOString()
        };

        this.viewpoints.push(viewpoint);
        this.saveViewpoints();
        this.updateViewpointList();

        // Show notification
        this.showNotification(`뷰포인트 "${name}" 저장됨`);
    }

    loadViewpoint(id) {
        const viewpoint = this.viewpoints.find(v => v.id === id);
        if (!viewpoint) return;

        // Animate camera to viewpoint
        this.animateCameraTo(
            viewpoint.position,
            viewpoint.target,
            1000 // duration in ms
        );

        this.currentIndex = this.viewpoints.indexOf(viewpoint);
        this.showNotification(`뷰포인트 "${viewpoint.name}" 로드됨`);
    }

    animateCameraTo(targetPosition, targetLookAt, duration) {
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-in-out)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : -1 + (4 - 2 * progress) * progress;

            // Interpolate position
            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            this.controls.target.lerpVectors(startTarget, targetLookAt, eased);
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    deleteViewpoint(id) {
        const index = this.viewpoints.findIndex(v => v.id === id);
        if (index === -1) return;

        const viewpoint = this.viewpoints[index];
        if (confirm(`"${viewpoint.name}" 뷰포인트를 삭제하시겠습니까?`)) {
            this.viewpoints.splice(index, 1);
            this.saveViewpoints();
            this.updateViewpointList();
            this.showNotification('뷰포인트 삭제됨');
        }
    }

    updateViewpointList() {
        const listContainer = document.getElementById('viewpoints-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (this.viewpoints.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; padding: 10px;">저장된 뷰포인트가 없습니다</p>';
            return;
        }

        this.viewpoints.forEach((viewpoint, index) => {
            const item = document.createElement('div');
            item.className = 'viewpoint-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = viewpoint.name;
            nameSpan.className = 'viewpoint-name';
            nameSpan.addEventListener('click', () => this.loadViewpoint(viewpoint.id));

            const timeSpan = document.createElement('span');
            const date = new Date(viewpoint.timestamp);
            timeSpan.textContent = date.toLocaleString('ko-KR');
            timeSpan.className = 'viewpoint-time';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteViewpoint(viewpoint.id);
            });

            item.appendChild(nameSpan);
            item.appendChild(timeSpan);
            item.appendChild(deleteBtn);
            listContainer.appendChild(item);
        });
    }

    saveViewpoints() {
        try {
            localStorage.setItem('bim-viewer-viewpoints', JSON.stringify(this.viewpoints));
        } catch (e) {
            console.error('Failed to save viewpoints:', e);
        }
    }

    loadViewpoints() {
        try {
            const saved = localStorage.getItem('bim-viewer-viewpoints');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.viewpoints = parsed.map(v => ({
                    ...v,
                    position: new THREE.Vector3(v.position.x, v.position.y, v.position.z),
                    target: new THREE.Vector3(v.target.x, v.target.y, v.target.z)
                }));
            }
        } catch (e) {
            console.error('Failed to load viewpoints:', e);
            this.viewpoints = [];
        }
    }

    exportViewpoints() {
        const dataStr = JSON.stringify(this.viewpoints, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `viewpoints-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showNotification('뷰포인트 내보내기 완료');
    }

    importViewpoints(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                this.viewpoints = [...this.viewpoints, ...imported];
                this.saveViewpoints();
                this.updateViewpointList();
                this.showNotification(`${imported.length}개 뷰포인트 가져오기 완료`);
            } catch (error) {
                alert('뷰포인트 파일을 읽을 수 없습니다.');
            }
        };
        reader.readAsText(file);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 102, 204, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    nextViewpoint() {
        if (this.viewpoints.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.viewpoints.length;
        this.loadViewpoint(this.viewpoints[this.currentIndex].id);
    }

    previousViewpoint() {
        if (this.viewpoints.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.viewpoints.length) % this.viewpoints.length;
        this.loadViewpoint(this.viewpoints[this.currentIndex].id);
    }
}
