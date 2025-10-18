import * as THREE from 'three';

/**
 * BCF (BIM Collaboration Format) Manager
 * BCF 형식으로 이슈를 내보내고 가져오기
 */
export class BCFManager {
    constructor(scene, camera, viewer) {
        this.scene = scene;
        this.camera = camera;
        this.viewer = viewer;
        this.issues = [];
        this.setupUI();
    }

    setupUI() {
        let panel = document.getElementById('bcf-panel');
        if (!panel) {
            panel = this.createPanel();
            document.body.appendChild(panel);
        }
        this.panel = panel;
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'bcf-panel';
        panel.style.cssText = `
            position: fixed;
            top: 120px;
            left: 20px;
            width: 350px;
            max-height: 500px;
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
                <h3 style="margin: 0; font-size: 16px; color: #0066cc;">BCF 이슈 관리</h3>
                <button id="close-bcf-panel" style="
                    background: none;
                    border: none;
                    color: #999;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 0;
                ">×</button>
            </div>

            <div style="margin-bottom: 15px;">
                <button id="create-bcf-issue-btn" style="
                    width: 100%;
                    padding: 10px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-bottom: 10px;
                ">
                    새 이슈 생성
                </button>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button id="export-bcf-btn" style="
                        padding: 8px;
                        background: #0066cc;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 13px;
                    ">
                        내보내기
                    </button>
                    <button id="import-bcf-btn" style="
                        padding: 8px;
                        background: #ffc107;
                        color: black;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 13px;
                    ">
                        가져오기
                    </button>
                </div>
            </div>

            <div id="bcf-issues-list" style="
                max-height: 300px;
                overflow-y: auto;
            ">
                <p style="color: #666; font-size: 13px; text-align: center;">이슈가 없습니다</p>
            </div>
        `;

        // 이벤트 리스너
        panel.querySelector('#close-bcf-panel').addEventListener('click', () => this.hide());
        panel.querySelector('#create-bcf-issue-btn').addEventListener('click', () => this.createIssue());
        panel.querySelector('#export-bcf-btn').addEventListener('click', () => this.exportBCF());
        panel.querySelector('#import-bcf-btn').addEventListener('click', () => this.importBCF());

        return panel;
    }

    createIssue() {
        const title = prompt('이슈 제목을 입력하세요:');
        if (!title) return;

        const description = prompt('이슈 설명을 입력하세요:');
        const priority = prompt('우선순위를 입력하세요 (High/Medium/Low):', 'Medium');

        const issue = {
            guid: this.generateGUID(),
            title: title,
            description: description || '',
            priority: priority || 'Medium',
            status: 'Open',
            author: 'BIM Viewer User',
            creationDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString(),
            camera: {
                position: this.camera.position.clone(),
                target: this.viewer.controls.target.clone(),
                fov: this.camera.fov
            },
            snapshot: this.captureSnapshot(),
            components: []
        };

        this.issues.push(issue);
        this.updateIssuesList();
        console.log('BCF Issue created:', issue);
    }

    captureSnapshot() {
        // 현재 화면을 Base64 이미지로 캡처
        return this.viewer.renderer.domElement.toDataURL('image/png');
    }

    updateIssuesList() {
        const container = this.panel.querySelector('#bcf-issues-list');

        if (this.issues.length === 0) {
            container.innerHTML = '<p style="color: #666; font-size: 13px; text-align: center;">이슈가 없습니다</p>';
            return;
        }

        let html = '';
        this.issues.forEach((issue, index) => {
            const priorityColor = {
                'High': '#dc3545',
                'Medium': '#ffc107',
                'Low': '#28a745'
            }[issue.priority] || '#6c757d';

            const statusColor = {
                'Open': '#0066cc',
                'In Progress': '#ffc107',
                'Resolved': '#28a745',
                'Closed': '#6c757d'
            }[issue.status] || '#6c757d';

            html += `
                <div style="
                    background: rgba(255,255,255,0.05);
                    border-left: 4px solid ${priorityColor};
                    padding: 12px;
                    margin-bottom: 10px;
                    border-radius: 4px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #fff; margin-bottom: 4px;">
                                ${issue.title}
                            </div>
                            <div style="font-size: 12px; color: #999;">
                                ${issue.description.substring(0, 50)}${issue.description.length > 50 ? '...' : ''}
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px;">
                        <span style="
                            background: ${priorityColor};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-size: 11px;
                        ">${issue.priority}</span>
                        <span style="
                            background: ${statusColor};
                            color: white;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-size: 11px;
                        ">${issue.status}</span>
                        <span style="
                            background: #6c757d;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-size: 11px;
                        ">${new Date(issue.creationDate).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="view-issue-btn" data-index="${index}" style="
                            flex: 1;
                            padding: 5px;
                            background: #0066cc;
                            color: white;
                            border: none;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 11px;
                        ">
                            보기
                        </button>
                        <button class="edit-issue-btn" data-index="${index}" style="
                            flex: 1;
                            padding: 5px;
                            background: #17a2b8;
                            color: white;
                            border: none;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 11px;
                        ">
                            수정
                        </button>
                        <button class="delete-issue-btn" data-index="${index}" style="
                            padding: 5px 10px;
                            background: #dc3545;
                            color: white;
                            border: none;
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

        // 이벤트 리스너
        container.querySelectorAll('.view-issue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.viewIssue(index);
            });
        });

        container.querySelectorAll('.edit-issue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editIssue(index);
            });
        });

        container.querySelectorAll('.delete-issue-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (confirm('이 이슈를 삭제하시겠습니까?')) {
                    this.issues.splice(index, 1);
                    this.updateIssuesList();
                }
            });
        });
    }

    viewIssue(index) {
        const issue = this.issues[index];

        // 카메라를 이슈 위치로 이동
        this.viewer.viewpointManager.animateCameraTo(
            issue.camera.position,
            issue.camera.target,
            1000
        );

        // 이슈 상세 정보 표시
        alert(`이슈: ${issue.title}\n\n${issue.description}\n\n우선순위: ${issue.priority}\n상태: ${issue.status}\n작성일: ${new Date(issue.creationDate).toLocaleString()}`);
    }

    editIssue(index) {
        const issue = this.issues[index];

        const newStatus = prompt('상태를 선택하세요 (Open/In Progress/Resolved/Closed):', issue.status);
        if (newStatus) {
            issue.status = newStatus;
            issue.modifiedDate = new Date().toISOString();
            this.updateIssuesList();
        }
    }

    exportBCF() {
        if (this.issues.length === 0) {
            alert('내보낼 이슈가 없습니다.');
            return;
        }

        const bcfData = {
            version: '2.1',
            project: {
                name: 'BIM Project',
                projectId: this.generateGUID()
            },
            topics: this.issues.map(issue => ({
                guid: issue.guid,
                title: issue.title,
                description: issue.description,
                priority: issue.priority,
                status: issue.status,
                creationDate: issue.creationDate,
                modifiedDate: issue.modifiedDate,
                creationAuthor: issue.author,
                viewpoint: {
                    camera: {
                        cameraPosition: {
                            x: issue.camera.position.x,
                            y: issue.camera.position.y,
                            z: issue.camera.position.z
                        },
                        cameraDirection: {
                            x: issue.camera.target.x - issue.camera.position.x,
                            y: issue.camera.target.y - issue.camera.position.y,
                            z: issue.camera.target.z - issue.camera.position.z
                        },
                        fieldOfView: issue.camera.fov
                    },
                    snapshot: issue.snapshot
                }
            }))
        };

        const blob = new Blob([JSON.stringify(bcfData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bcf-issues-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('BCF exported successfully');
    }

    importBCF() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const bcfData = JSON.parse(event.target.result);

                    if (bcfData.topics && Array.isArray(bcfData.topics)) {
                        bcfData.topics.forEach(topic => {
                            const issue = {
                                guid: topic.guid || this.generateGUID(),
                                title: topic.title,
                                description: topic.description,
                                priority: topic.priority || 'Medium',
                                status: topic.status || 'Open',
                                author: topic.creationAuthor || 'Unknown',
                                creationDate: topic.creationDate,
                                modifiedDate: topic.modifiedDate,
                                camera: {
                                    position: new THREE.Vector3(
                                        topic.viewpoint?.camera?.cameraPosition?.x || 0,
                                        topic.viewpoint?.camera?.cameraPosition?.y || 0,
                                        topic.viewpoint?.camera?.cameraPosition?.z || 0
                                    ),
                                    target: new THREE.Vector3(0, 0, 0), // Calculate from direction if needed
                                    fov: topic.viewpoint?.camera?.fieldOfView || 75
                                },
                                snapshot: topic.viewpoint?.snapshot || '',
                                components: []
                            };
                            this.issues.push(issue);
                        });

                        this.updateIssuesList();
                        alert(`${bcfData.topics.length}개의 이슈를 가져왔습니다!`);
                        console.log('BCF imported successfully');
                    }
                } catch (error) {
                    console.error('BCF import error:', error);
                    alert('BCF 파일을 불러오는데 실패했습니다.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    generateGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    show() {
        this.panel.style.display = 'block';
        this.updateIssuesList();
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

    getIssues() {
        return this.issues;
    }
}
