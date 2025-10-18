import * as THREE from 'three';

/**
 * 4D BIM Timeline Simulator
 * 시간 기반 공정 시뮬레이션
 */
export class TimelineSimulator {
    constructor(scene, viewer) {
        this.scene = scene;
        this.viewer = viewer;
        this.timeline = [];
        this.currentDate = new Date();
        this.isPlaying = false;
        this.playbackSpeed = 1; // days per second
        this.setupUI();
    }

    setupUI() {
        let panel = document.getElementById('timeline-panel');
        if (!panel) {
            panel = this.createPanel();
            document.body.appendChild(panel);
        }
        this.panel = panel;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'timeline-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
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
                <h3 style="margin: 0; font-size: 16px; color: #0066cc;">4D 공정 시뮬레이션</h3>
                <button id="close-timeline-panel" style="
                    background: none;
                    border: none;
                    color: #999;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                ">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <label style="font-size: 13px; color: #999;">현재 날짜</label>
                    <span id="current-date-display" style="font-size: 14px; color: #0066cc; font-weight: bold;">
                        ${new Date().toLocaleDateString('ko-KR')}
                    </span>
                </div>

                <input type="range" id="timeline-slider" min="0" max="100" value="0" step="1" style="
                    width: 100%;
                    margin-bottom: 10px;
                ">

                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-bottom: 15px;">
                    <span id="start-date-label">시작일</span>
                    <span id="end-date-label">종료일</span>
                </div>

                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-size: 13px; color: #999;">
                        재생 속도 (일/초): <span id="speed-value">1</span>
                    </label>
                    <input type="range" id="speed-slider" min="0.1" max="10" value="1" step="0.1" style="width: 100%;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <button id="play-timeline-btn" style="
                        padding: 10px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 13px;
                    ">
                        재생
                    </button>
                    <button id="pause-timeline-btn" style="
                        padding: 10px;
                        background: #ffc107;
                        color: black;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 13px;
                    ">
                        일시정지
                    </button>
                    <button id="reset-timeline-btn" style="
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
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #0066cc;">공정 일정</h4>
                <button id="add-schedule-btn" style="
                    width: 100%;
                    padding: 8px;
                    background: #0066cc;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                    margin-bottom: 10px;
                ">
                    일정 추가
                </button>
                <div id="schedule-list" style="
                    max-height: 200px;
                    overflow-y: auto;
                ">
                    <p style="color: #666; font-size: 13px; text-align: center;">일정이 없습니다</p>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="export-timeline-btn" style="
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
                <button id="import-timeline-btn" style="
                    flex: 1;
                    padding: 8px;
                    background: #6c757d;
                    color: white;
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
        panel.querySelector('#close-timeline-panel').addEventListener('click', () => this.hide());
        panel.querySelector('#play-timeline-btn').addEventListener('click', () => this.play());
        panel.querySelector('#pause-timeline-btn').addEventListener('click', () => this.pause());
        panel.querySelector('#reset-timeline-btn').addEventListener('click', () => this.reset());
        panel.querySelector('#add-schedule-btn').addEventListener('click', () => this.addSchedule());
        panel.querySelector('#export-timeline-btn').addEventListener('click', () => this.exportTimeline());
        panel.querySelector('#import-timeline-btn').addEventListener('click', () => this.importTimeline());

        const slider = panel.querySelector('#timeline-slider');
        slider.addEventListener('input', (e) => this.onSliderChange(e));

        const speedSlider = panel.querySelector('#speed-slider');
        const speedValue = panel.querySelector('#speed-value');
        speedSlider.addEventListener('input', (e) => {
            this.playbackSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.playbackSpeed.toFixed(1);
        });

        return panel;
    }

    addSchedule() {
        const objectName = prompt('객체 이름 또는 카테고리를 입력하세요:');
        if (!objectName) return;

        const startDate = prompt('시작 날짜 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!startDate) return;

        const endDate = prompt('종료 날짜 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!endDate) return;

        const action = prompt('액션 (show/hide/highlight):', 'show');

        const schedule = {
            id: Date.now(),
            objectName: objectName,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            action: action || 'show',
            color: this.getRandomColor()
        };

        this.timeline.push(schedule);
        this.timeline.sort((a, b) => a.startDate - b.startDate);
        this.updateScheduleList();
        this.updateDateRange();

        console.log('Schedule added:', schedule);
    }

    updateScheduleList() {
        const container = this.panel.querySelector('#schedule-list');

        if (this.timeline.length === 0) {
            container.innerHTML = '<p style="color: #666; font-size: 13px; text-align: center;">일정이 없습니다</p>';
            return;
        }

        let html = '';
        this.timeline.forEach((schedule, index) => {
            html += `
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-left: 4px solid ${schedule.color};
                    padding: 10px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                ">
                    <div style="font-weight: bold; margin-bottom: 5px; color: #fff;">
                        ${schedule.objectName}
                    </div>
                    <div style="font-size: 12px; color: #999; margin-bottom: 5px;">
                        ${schedule.startDate.toLocaleDateString()} ~ ${schedule.endDate.toLocaleDateString()}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="
                            background: #0066cc;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-size: 11px;
                        ">${schedule.action}</span>
                        <button class="delete-schedule-btn" data-index="${index}" style="
                            background: #dc3545;
                            border: none;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 11px;
                        ">
                            삭제
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // 삭제 버튼 이벤트
        container.querySelectorAll('.delete-schedule-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.timeline.splice(index, 1);
                this.updateScheduleList();
                this.updateDateRange();
            });
        });
    }

    updateDateRange() {
        if (this.timeline.length === 0) return;

        const startDate = new Date(Math.min(...this.timeline.map(s => s.startDate)));
        const endDate = new Date(Math.max(...this.timeline.map(s => s.endDate)));

        this.startDate = startDate;
        this.endDate = endDate;
        this.currentDate = new Date(startDate);

        this.panel.querySelector('#start-date-label').textContent = startDate.toLocaleDateString('ko-KR');
        this.panel.querySelector('#end-date-label').textContent = endDate.toLocaleDateString('ko-KR');
        this.panel.querySelector('#timeline-slider').value = 0;
    }

    onSliderChange(event) {
        if (!this.startDate || !this.endDate) return;

        const value = parseFloat(event.target.value);
        const totalDays = (this.endDate - this.startDate) / (1000 * 60 * 60 * 24);
        const dayOffset = (totalDays * value) / 100;

        this.currentDate = new Date(this.startDate.getTime() + (dayOffset * 1000 * 60 * 60 * 24));
        this.panel.querySelector('#current-date-display').textContent = this.currentDate.toLocaleDateString('ko-KR');

        this.updateVisualization();
    }

    play() {
        if (this.timeline.length === 0) {
            alert('공정 일정을 먼저 추가하세요.');
            return;
        }

        this.isPlaying = true;
        console.log('Timeline simulation started');
        this.animate();
    }

    pause() {
        this.isPlaying = false;
        console.log('Timeline simulation paused');
    }

    reset() {
        this.isPlaying = false;
        if (this.startDate) {
            this.currentDate = new Date(this.startDate);
            this.panel.querySelector('#timeline-slider').value = 0;
            this.panel.querySelector('#current-date-display').textContent = this.currentDate.toLocaleDateString('ko-KR');
            this.updateVisualization();
        }
        console.log('Timeline reset');
    }

    animate() {
        if (!this.isPlaying) return;

        // 날짜 증가
        const increment = this.playbackSpeed * (1000 / 60); // 60 FPS 기준
        this.currentDate = new Date(this.currentDate.getTime() + (increment * 1000 * 60 * 60 * 24));

        // 슬라이더 업데이트
        if (this.startDate && this.endDate) {
            const progress = ((this.currentDate - this.startDate) / (this.endDate - this.startDate)) * 100;
            this.panel.querySelector('#timeline-slider').value = Math.min(progress, 100);
            this.panel.querySelector('#current-date-display').textContent = this.currentDate.toLocaleDateString('ko-KR');

            if (progress >= 100) {
                this.pause();
                return;
            }
        }

        this.updateVisualization();
        requestAnimationFrame(() => this.animate());
    }

    updateVisualization() {
        // 각 스케줄에 따라 객체의 가시성 업데이트
        this.timeline.forEach(schedule => {
            if (this.currentDate >= schedule.startDate && this.currentDate <= schedule.endDate) {
                // 스케줄이 활성화된 경우
                this.applyScheduleAction(schedule, true);
            } else {
                // 스케줄이 비활성화된 경우
                this.applyScheduleAction(schedule, false);
            }
        });
    }

    applyScheduleAction(schedule, isActive) {
        const objectName = schedule.objectName.toLowerCase();

        this.scene.traverse((object) => {
            if (object.isMesh) {
                const name = (object.name || '').toLowerCase();
                const category = (object.userData.category || '').toLowerCase();

                if (name.includes(objectName) || category.includes(objectName)) {
                    switch (schedule.action) {
                        case 'show':
                            object.visible = isActive;
                            break;
                        case 'hide':
                            object.visible = !isActive;
                            break;
                        case 'highlight':
                            if (isActive) {
                                if (object.userData.originalMaterial) {
                                    object.material = object.material.clone();
                                    object.material.emissive = new THREE.Color(schedule.color);
                                    object.material.emissiveIntensity = 0.5;
                                }
                            } else {
                                if (object.userData.originalMaterial) {
                                    object.material = object.userData.originalMaterial;
                                }
                            }
                            break;
                    }
                }
            }
        });
    }

    exportTimeline() {
        if (this.timeline.length === 0) {
            alert('저장할 일정이 없습니다.');
            return;
        }

        const data = {
            timeline: this.timeline.map(s => ({
                objectName: s.objectName,
                startDate: s.startDate.toISOString(),
                endDate: s.endDate.toISOString(),
                action: s.action,
                color: s.color
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeline-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('Timeline exported');
    }

    importTimeline() {
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
                    this.timeline = data.timeline.map(s => ({
                        ...s,
                        id: Date.now() + Math.random(),
                        startDate: new Date(s.startDate),
                        endDate: new Date(s.endDate)
                    }));

                    this.timeline.sort((a, b) => a.startDate - b.startDate);
                    this.updateScheduleList();
                    this.updateDateRange();

                    alert('타임라인을 불러왔습니다!');
                    console.log('Timeline imported');
                } catch (error) {
                    console.error('Import error:', error);
                    alert('파일을 불러오는데 실패했습니다.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    getRandomColor() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];
        return colors[Math.floor(Math.random() * colors.length)];
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
