import * as THREE from 'three';

export class CameraPathAnimator {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        this.waypoints = [];
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 5000; // ms per waypoint
        this.curve = null;
        this.pathLine = null;
        this.setupUI();
    }

    setupUI() {
        // 애니메이션 패널 생성
        let panel = document.getElementById('camera-path-panel');
        if (!panel) {
            panel = this.createPanel();
            document.body.appendChild(panel);
        }
        this.panel = panel;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'camera-path-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 350px;
            max-height: 400px;
            background: rgba(26, 26, 26, 0.95);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 15px;
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            display: none;
            z-index: 1000;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 16px; color: #0066cc;">카메라 경로</h3>
                <button id="close-camera-path" style="
                    background: none;
                    border: none;
                    color: #999;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                ">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #999;">
                    이동 속도 (초/지점)
                </label>
                <input type="range" id="path-duration" min="1" max="10" value="5" step="0.5" style="width: 100%;">
                <span id="path-duration-value" style="font-size: 12px; color: #0066cc;">5초</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <button id="add-waypoint-btn" style="
                    padding: 10px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                ">
                    지점 추가
                </button>
                <button id="clear-waypoints-btn" style="
                    padding: 10px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                ">
                    초기화
                </button>
            </div>

            <div id="waypoints-list" style="
                max-height: 150px;
                overflow-y: auto;
                margin-bottom: 15px;
                padding: 10px;
                background: rgba(0,0,0,0.3);
                border-radius: 5px;
            ">
                <p style="color: #666; font-size: 13px; text-align: center;">지점이 없습니다</p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button id="play-animation-btn" style="
                    padding: 12px;
                    background: #0066cc;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                ">
                    재생
                </button>
                <button id="stop-animation-btn" style="
                    padding: 12px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">
                    정지
                </button>
            </div>

            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button id="export-path-btn" style="
                    flex: 1;
                    padding: 8px;
                    background: #17a2b8;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    저장
                </button>
                <button id="import-path-btn" style="
                    flex: 1;
                    padding: 8px;
                    background: #ffc107;
                    color: black;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 12px;
                ">
                    불러오기
                </button>
            </div>
        `;

        // 이벤트 리스너
        panel.querySelector('#close-camera-path').addEventListener('click', () => this.hide());
        panel.querySelector('#add-waypoint-btn').addEventListener('click', () => this.addWaypoint());
        panel.querySelector('#clear-waypoints-btn').addEventListener('click', () => this.clearWaypoints());
        panel.querySelector('#play-animation-btn').addEventListener('click', () => this.playAnimation());
        panel.querySelector('#stop-animation-btn').addEventListener('click', () => this.stopAnimation());
        panel.querySelector('#export-path-btn').addEventListener('click', () => this.exportPath());
        panel.querySelector('#import-path-btn').addEventListener('click', () => this.importPath());

        const durationSlider = panel.querySelector('#path-duration');
        const durationValue = panel.querySelector('#path-duration-value');
        durationSlider.addEventListener('input', (e) => {
            this.duration = parseFloat(e.target.value) * 1000;
            durationValue.textContent = `${e.target.value}초`;
        });

        return panel;
    }

    addWaypoint() {
        const waypoint = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone(),
            timestamp: Date.now()
        };

        this.waypoints.push(waypoint);
        this.updateWaypointsList();
        this.updatePath();

        console.log(`Waypoint ${this.waypoints.length} added:`, waypoint);
    }

    updateWaypointsList() {
        const container = this.panel.querySelector('#waypoints-list');

        if (this.waypoints.length === 0) {
            container.innerHTML = '<p style="color: #666; font-size: 13px; text-align: center;">지점이 없습니다</p>';
            return;
        }

        let html = '';
        this.waypoints.forEach((wp, index) => {
            html += `
                <div style="
                    background: rgba(255,255,255,0.05);
                    padding: 8px;
                    margin-bottom: 5px;
                    border-radius: 4px;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <strong>지점 ${index + 1}</strong><br>
                        <span style="color: #999;">
                            (${wp.position.x.toFixed(1)}, ${wp.position.y.toFixed(1)}, ${wp.position.z.toFixed(1)})
                        </span>
                    </div>
                    <button class="remove-waypoint-btn" data-index="${index}" style="
                        background: #dc3545;
                        border: none;
                        color: white;
                        padding: 4px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 11px;
                    ">
                        ✕
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        // 삭제 버튼 이벤트
        container.querySelectorAll('.remove-waypoint-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeWaypoint(index);
            });
        });
    }

    removeWaypoint(index) {
        this.waypoints.splice(index, 1);
        this.updateWaypointsList();
        this.updatePath();
    }

    clearWaypoints() {
        if (this.waypoints.length > 0 && !confirm('모든 지점을 삭제하시겠습니까?')) {
            return;
        }

        this.waypoints = [];
        this.updateWaypointsList();
        this.clearPath();
    }

    updatePath() {
        // 기존 경로 제거
        this.clearPath();

        if (this.waypoints.length < 2) return;

        // Catmull-Rom 곡선 생성
        const points = this.waypoints.map(wp => wp.position);
        this.curve = new THREE.CatmullRomCurve3(points);

        // 경로 시각화
        const curvePoints = this.curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
        this.pathLine = new THREE.Line(geometry, material);

        // 씬에 추가 (viewer에서 scene 접근 필요)
        if (window.viewer && window.viewer.scene) {
            window.viewer.scene.add(this.pathLine);
        }
    }

    clearPath() {
        if (this.pathLine && window.viewer && window.viewer.scene) {
            window.viewer.scene.remove(this.pathLine);
            this.pathLine.geometry.dispose();
            this.pathLine.material.dispose();
            this.pathLine = null;
        }
    }

    playAnimation() {
        if (this.waypoints.length < 2) {
            alert('최소 2개의 지점이 필요합니다.');
            return;
        }

        if (this.isPlaying) {
            console.log('Animation already playing');
            return;
        }

        this.isPlaying = true;
        this.currentTime = 0;

        console.log('Starting camera path animation');
        this.animateCamera();
    }

    stopAnimation() {
        this.isPlaying = false;
        this.currentTime = 0;
        console.log('Animation stopped');
    }

    animateCamera() {
        if (!this.isPlaying || !this.curve) return;

        const totalDuration = this.duration * (this.waypoints.length - 1);
        this.currentTime += 16; // ~60fps

        const t = Math.min(this.currentTime / totalDuration, 1);

        // 곡선을 따라 카메라 이동
        const position = this.curve.getPoint(t);
        this.camera.position.copy(position);

        // 타겟도 보간
        const targetIndex = Math.floor(t * (this.waypoints.length - 1));
        const nextTargetIndex = Math.min(targetIndex + 1, this.waypoints.length - 1);
        const localT = (t * (this.waypoints.length - 1)) - targetIndex;

        const currentTarget = this.waypoints[targetIndex].target;
        const nextTarget = this.waypoints[nextTargetIndex].target;

        const interpolatedTarget = new THREE.Vector3()
            .lerpVectors(currentTarget, nextTarget, localT);

        this.controls.target.copy(interpolatedTarget);
        this.controls.update();

        if (t < 1) {
            requestAnimationFrame(() => this.animateCamera());
        } else {
            this.stopAnimation();
            console.log('Animation completed');
        }
    }

    exportPath() {
        if (this.waypoints.length === 0) {
            alert('저장할 지점이 없습니다.');
            return;
        }

        const data = {
            waypoints: this.waypoints.map(wp => ({
                position: { x: wp.position.x, y: wp.position.y, z: wp.position.z },
                target: { x: wp.target.x, y: wp.target.y, z: wp.target.z }
            })),
            duration: this.duration
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `camera-path-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('Camera path exported');
    }

    importPath() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.waypoints = data.waypoints.map(wp => ({
                        position: new THREE.Vector3(wp.position.x, wp.position.y, wp.position.z),
                        target: new THREE.Vector3(wp.target.x, wp.target.y, wp.target.z),
                        timestamp: Date.now()
                    }));
                    this.duration = data.duration || 5000;

                    this.updateWaypointsList();
                    this.updatePath();

                    console.log('Camera path imported');
                    alert('카메라 경로를 불러왔습니다!');
                } catch (error) {
                    console.error('Import error:', error);
                    alert('파일을 불러오는데 실패했습니다.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    show() {
        this.panel.style.display = 'block';
    }

    hide() {
        this.panel.style.display = 'none';
    }

    toggle() {
        if (this.panel.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }
}
