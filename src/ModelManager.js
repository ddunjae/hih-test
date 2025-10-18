import * as THREE from 'three';

export class ModelManager {
    constructor(scene, ifcLoader) {
        this.scene = scene;
        this.ifcLoader = ifcLoader;
        this.setupUI();
    }

    setupUI() {
        // 모델 관리 패널이 이미 있는지 확인
        let panel = document.getElementById('model-manager-panel');
        if (!panel) {
            panel = this.createPanel();
            document.body.appendChild(panel);
        }

        this.panel = panel;
        this.updateModelList();
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'model-manager-panel';
        panel.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            width: 300px;
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
            overflow-y: auto;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 16px; color: #0066cc;">모델 관리</h3>
                <button id="close-model-manager" style="
                    background: none;
                    border: none;
                    color: #999;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                ">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <label for="multiple-file-input" style="
                    display: block;
                    width: 100%;
                    padding: 10px;
                    background: #0066cc;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    text-align: center;
                    font-size: 14px;
                ">
                    + 여러 파일 추가
                </label>
                <input type="file" id="multiple-file-input" accept=".ifc" multiple style="display: none;">
            </div>

            <div id="model-list-container" style="
                max-height: 250px;
                overflow-y: auto;
            ">
                <p style="color: #666; font-size: 13px; text-align: center;">로드된 모델이 없습니다</p>
            </div>
        `;

        // 이벤트 리스너
        const closeBtn = panel.querySelector('#close-model-manager');
        closeBtn.addEventListener('click', () => this.hide());

        const fileInput = panel.querySelector('#multiple-file-input');
        fileInput.addEventListener('change', (e) => this.handleMultipleFiles(e));

        return panel;
    }

    async handleMultipleFiles(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
            loading.innerHTML = '초기화 중... 0%';
        }

        try {
            const results = await this.ifcLoader.loadMultipleIFCFiles(files,
                (progress, current, total, fileName) => {
                    if (loading) {
                        loading.innerHTML = `파일 ${current}/${total} 로딩 중...<br>${fileName}<br>${progress.toFixed(0)}%`;
                    }
                }
            );

            // 결과 요약
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            console.log(`✓ ${successCount} files loaded successfully`);
            if (failCount > 0) {
                console.warn(`✗ ${failCount} files failed to load`);
            }

            this.updateModelList();

            if (loading) {
                loading.style.display = 'none';
                loading.innerHTML = '로딩 중...';
            }

            // 성공/실패 알림
            alert(`로딩 완료!\n성공: ${successCount}개\n실패: ${failCount}개`);

        } catch (error) {
            console.error('Multiple file loading error:', error);
            if (loading) {
                loading.style.display = 'none';
                loading.innerHTML = '로딩 중...';
            }
            alert('파일 로딩 중 오류가 발생했습니다.');
        }

        // 파일 입력 초기화
        event.target.value = '';
    }

    updateModelList() {
        const container = this.panel.querySelector('#model-list-container');
        const modelsInfo = this.ifcLoader.getModelsInfo();

        if (modelsInfo.length === 0) {
            container.innerHTML = '<p style="color: #666; font-size: 13px; text-align: center;">로드된 모델이 없습니다</p>';
            return;
        }

        let html = '';
        modelsInfo.forEach((info, index) => {
            const colorHex = '#' + info.color.toString(16).padStart(6, '0');
            html += `
                <div class="model-item" style="
                    background: rgba(255,255,255,0.05);
                    border-left: 4px solid ${colorHex};
                    padding: 10px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    font-size: 13px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div style="font-weight: bold; color: ${colorHex}; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${info.name}
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="toggle-visibility-btn" data-index="${index}" style="
                                background: ${info.visible ? '#28a745' : '#dc3545'};
                                border: none;
                                color: white;
                                padding: 2px 8px;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 11px;
                            ">
                                ${info.visible ? '표시' : '숨김'}
                            </button>
                            <button class="remove-model-btn" data-index="${index}" style="
                                background: #dc3545;
                                border: none;
                                color: white;
                                padding: 2px 8px;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 11px;
                            ">
                                삭제
                            </button>
                        </div>
                    </div>
                    <div style="color: #999; font-size: 11px;">
                        객체: ${info.objectCount} | 삼각형: ${info.triangleCount.toLocaleString()}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // 이벤트 리스너 추가
        container.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const model = this.ifcLoader.getModels()[index];
                this.ifcLoader.toggleModelVisibility(index, !model.visible);
                this.updateModelList();
            });
        });

        container.querySelectorAll('.remove-model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('이 모델을 제거하시겠습니까?')) {
                    this.ifcLoader.removeModel(index);
                    this.updateModelList();
                }
            });
        });
    }

    show() {
        this.panel.style.display = 'block';
        this.updateModelList();
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
