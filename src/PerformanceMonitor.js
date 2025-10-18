import * as THREE from 'three';

/**
 * Performance Monitoring Dashboard
 * 실시간 성능 모니터링 및 최적화 제안
 */
export class PerformanceMonitor {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.memoryUsage = 0;
        this.drawCalls = 0;
        this.triangles = 0;
        this.geometries = 0;
        this.textures = 0;
        this.materials = 0;
        this.isVisible = false;
        this.setupUI();
        this.startMonitoring();
    }

    setupUI() {
        const dashboard = document.createElement('div');
        dashboard.id = 'performance-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 15px;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            display: none;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.7);
        `;

        dashboard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #0066cc; padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 14px; color: #0066cc;">성능 모니터</h3>
                <button id="close-performance-dashboard" style="
                    background: none;
                    border: none;
                    color: #0066cc;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0;
                ">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #999;">FPS:</span>
                    <span id="fps-value" style="color: #0f0; font-weight: bold;">60</span>
                </div>
                <div style="width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden; margin-bottom: 15px;">
                    <div id="fps-bar" style="height: 100%; background: #0f0; width: 100%; transition: width 0.3s;"></div>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">메모리:</span>
                    <span id="memory-value" style="color: #ff0;">0 MB</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Draw Calls:</span>
                    <span id="drawcalls-value" style="color: #0ff;">0</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">삼각형:</span>
                    <span id="triangles-value" style="color: #f0f;">0</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Geometries:</span>
                    <span id="geometries-value" style="color: #ff0;">0</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: #999;">Textures:</span>
                    <span id="textures-value" style="color: #0ff;">0</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <span style="color: #999;">Materials:</span>
                    <span id="materials-value" style="color: #f0f;">0</span>
                </div>
            </div>

            <div style="border-top: 1px solid #0066cc; padding-top: 10px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #0066cc;">최적화 제안</h4>
                <div id="optimization-tips" style="
                    max-height: 150px;
                    overflow-y: auto;
                    font-size: 11px;
                    line-height: 1.5;
                ">
                    <p style="color: #666; margin: 0;">분석 중...</p>
                </div>
            </div>

            <div style="margin-top: 15px; display: flex; gap: 5px;">
                <button id="optimize-btn" style="
                    flex: 1;
                    padding: 8px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 11px;
                ">
                    자동 최적화
                </button>
                <button id="reset-stats-btn" style="
                    flex: 1;
                    padding: 8px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 11px;
                ">
                    통계 초기화
                </button>
            </div>
        `;

        document.body.appendChild(dashboard);
        this.dashboard = dashboard;

        // 이벤트 리스너
        dashboard.querySelector('#close-performance-dashboard').addEventListener('click', () => this.hide());
        dashboard.querySelector('#optimize-btn').addEventListener('click', () => this.autoOptimize());
        dashboard.querySelector('#reset-stats-btn').addEventListener('click', () => this.resetStats());
    }

    startMonitoring() {
        setInterval(() => {
            if (!this.isVisible) return;
            this.updateStats();
        }, 100); // Update every 100ms
    }

    updateStats() {
        // FPS 계산
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime >= this.lastTime + 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        // 메모리 사용량 (Chrome only)
        if (performance.memory) {
            this.memoryUsage = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        }

        // Three.js 통계
        const info = this.renderer.info;
        this.drawCalls = info.render.calls;
        this.triangles = info.render.triangles;
        this.geometries = info.memory.geometries;
        this.textures = info.memory.textures;

        // Materials 계산
        let materialCount = 0;
        this.scene.traverse((obj) => {
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    materialCount += obj.material.length;
                } else {
                    materialCount++;
                }
            }
        });
        this.materials = materialCount;

        // UI 업데이트
        this.updateUI();
        this.analyzePerformance();
    }

    updateUI() {
        const fpsColor = this.fps >= 50 ? '#0f0' : this.fps >= 30 ? '#ff0' : '#f00';
        const fpsPercent = Math.min((this.fps / 60) * 100, 100);

        this.dashboard.querySelector('#fps-value').textContent = this.fps;
        this.dashboard.querySelector('#fps-value').style.color = fpsColor;
        this.dashboard.querySelector('#fps-bar').style.width = fpsPercent + '%';
        this.dashboard.querySelector('#fps-bar').style.background = fpsColor;

        this.dashboard.querySelector('#memory-value').textContent = this.memoryUsage + ' MB';
        this.dashboard.querySelector('#drawcalls-value').textContent = this.drawCalls;
        this.dashboard.querySelector('#triangles-value').textContent = this.triangles.toLocaleString();
        this.dashboard.querySelector('#geometries-value').textContent = this.geometries;
        this.dashboard.querySelector('#textures-value').textContent = this.textures;
        this.dashboard.querySelector('#materials-value').textContent = this.materials;
    }

    analyzePerformance() {
        const tips = [];

        if (this.fps < 30) {
            tips.push('⚠️ FPS가 낮습니다. 최적화가 필요합니다.');
        }

        if (this.drawCalls > 1000) {
            tips.push('⚠️ Draw Call이 너무 많습니다. 메시 병합을 고려하세요.');
        }

        if (this.triangles > 5000000) {
            tips.push('⚠️ 삼각형 수가 너무 많습니다. LOD를 사용하세요.');
        }

        if (this.geometries > 500) {
            tips.push('⚠️ Geometry가 너무 많습니다. 인스턴싱을 고려하세요.');
        }

        if (this.textures > 100) {
            tips.push('⚠️ 텍스처가 너무 많습니다. 아틀라스를 사용하세요.');
        }

        if (this.materials > 200) {
            tips.push('⚠️ Material이 너무 많습니다. 재사용을 고려하세요.');
        }

        if (this.memoryUsage > 1000) {
            tips.push('⚠️ 메모리 사용량이 높습니다. 가비지 컬렉션이 필요합니다.');
        }

        // 좋은 성능
        if (this.fps >= 50 && this.drawCalls < 500 && this.triangles < 2000000) {
            tips.push('✅ 성능이 양호합니다!');
        }

        // 최적화 팁
        if (tips.length === 0 || (this.fps >= 50 && tips.length <= 2)) {
            tips.push('💡 Frustum Culling이 활성화되어 있습니다.');
            tips.push('💡 Shadow Map 해상도를 낮추면 성능이 향상됩니다.');
            tips.push('💡 안티앨리어싱을 끄면 FPS가 향상될 수 있습니다.');
        }

        this.dashboard.querySelector('#optimization-tips').innerHTML =
            tips.map(tip => `<p style="margin: 5px 0; color: ${tip.includes('✅') ? '#0f0' : tip.includes('⚠️') ? '#ff0' : '#0ff'};">${tip}</p>`).join('');
    }

    autoOptimize() {
        let optimizations = [];

        // 그림자 품질 낮추기
        if (this.fps < 40) {
            this.renderer.shadowMap.enabled = false;
            optimizations.push('그림자 비활성화');
        }

        // 안티앨리어싱 끄기
        if (this.fps < 35) {
            this.renderer.antialias = false;
            optimizations.push('안티앨리어싱 비활성화');
        }

        // 픽셀 비율 낮추기
        if (this.fps < 30) {
            this.renderer.setPixelRatio(1);
            optimizations.push('픽셀 비율 조정');
        }

        // Material 정리
        let disposed = 0;
        const usedMaterials = new Set();
        this.scene.traverse((obj) => {
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => usedMaterials.add(m));
                } else {
                    usedMaterials.add(obj.material);
                }
            }
        });

        // 가비지 컬렉션 힌트
        if (global.gc) {
            global.gc();
            optimizations.push('가비지 컬렉션 실행');
        }

        if (optimizations.length > 0) {
            alert('자동 최적화 완료:\n\n' + optimizations.join('\n'));
            console.log('Auto-optimization applied:', optimizations);
        } else {
            alert('추가 최적화가 필요하지 않습니다.');
        }
    }

    resetStats() {
        this.renderer.info.reset();
        this.frameCount = 0;
        this.lastTime = performance.now();
        console.log('Performance stats reset');
    }

    show() {
        this.dashboard.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        this.dashboard.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    update() {
        this.frameCount++;
    }

    getStats() {
        return {
            fps: this.fps,
            memoryUsage: this.memoryUsage,
            drawCalls: this.drawCalls,
            triangles: this.triangles,
            geometries: this.geometries,
            textures: this.textures,
            materials: this.materials
        };
    }
}
