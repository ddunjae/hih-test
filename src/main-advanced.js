import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from './IFCLoader.js';
import { ViewerControls } from './ViewerControls.js';
import { MeasurementTool } from './MeasurementTool.js';
import { SectionTool } from './SectionTool.js';
import { ObjectExplorer } from './ObjectExplorer.js';
import { ViewpointManager } from './ViewpointManager.js';
import { ScreenshotTool } from './ScreenshotTool.js';
import { AnnotationTool } from './AnnotationTool.js';
import { AreaVolumeTool } from './AreaVolumeTool.js';
import { CollisionDetector } from './CollisionDetector.js';
import { IFCObjectSelector } from './IFCObjectSelector.js';

class AdvancedBIMViewer {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.selectedObject = null;
        this.wireframeMode = false;

        this.init();
        this.setupEventListeners();
        this.setupUI();
        this.animate();
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(50, 50, 50);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true // For screenshots
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lights
        this.setupLights();

        // OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;

        // Helpers
        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Tools
        this.ifcLoader = new IFCLoader(this.scene);
        this.objectSelector = new IFCObjectSelector(this.scene, this.camera, this.renderer.domElement, this.ifcLoader);
        this.measurementTool = new MeasurementTool(this.scene, this.camera, this.renderer.domElement);
        this.sectionTool = new SectionTool(this.scene, this.renderer);
        this.viewerControls = new ViewerControls(this);
        this.objectExplorer = new ObjectExplorer(this.scene, this);
        this.viewpointManager = new ViewpointManager(this.camera, this.controls);
        this.screenshotTool = new ScreenshotTool(this.renderer, this.scene, this.camera);
        this.annotationTool = new AnnotationTool(this.scene, this.camera, this.renderer.domElement);
        this.areaVolumeTool = new AreaVolumeTool(this.scene, this.camera, this.renderer.domElement);
        this.collisionDetector = new CollisionDetector(this.scene);

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // FPS Counter
        this.fps = 0;
        this.lastTime = performance.now();
        this.frames = 0;
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        hemiLight.position.set(0, 100, 0);
        this.scene.add(hemiLight);
    }

    setupUI() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                const tabId = btn.getAttribute('data-tab');
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });

        // Sidebar toggles
        const toggleLeft = document.getElementById('toggle-left');
        const toggleRight = document.getElementById('toggle-right');
        const sidebarLeft = document.getElementById('sidebar-left');
        const sidebarRight = document.getElementById('sidebar-right');

        if (toggleLeft) {
            toggleLeft.addEventListener('click', () => {
                sidebarLeft.classList.toggle('collapsed');
                toggleLeft.textContent = sidebarLeft.classList.contains('collapsed') ? '▶' : '◀';
            });
        }

        if (toggleRight) {
            toggleRight.addEventListener('click', () => {
                sidebarRight.classList.toggle('collapsed');
                toggleRight.textContent = sidebarRight.classList.contains('collapsed') ? '◀' : '▶';
            });
        }

        // Category controls
        const showAllBtn = document.getElementById('show-all-categories');
        const hideAllBtn = document.getElementById('hide-all-categories');

        if (showAllBtn) showAllBtn.addEventListener('click', () => this.objectExplorer.showAll());
        if (hideAllBtn) hideAllBtn.addEventListener('click', () => this.objectExplorer.hideAll());

        // Annotation controls
        const clearAnnotationsBtn = document.getElementById('clear-annotations-btn');
        const exportAnnotationsBtn = document.getElementById('export-annotations-btn');

        if (clearAnnotationsBtn) {
            clearAnnotationsBtn.addEventListener('click', () => this.annotationTool.clearAll());
        }
        if (exportAnnotationsBtn) {
            exportAnnotationsBtn.addEventListener('click', () => this.annotationTool.exportAnnotations());
        }

        // Section value display
        ['x', 'y', 'z'].forEach(axis => {
            const slider = document.getElementById(`section-${axis}`);
            const display = document.getElementById(`section-${axis}-value`);
            if (slider && display) {
                slider.addEventListener('input', (e) => {
                    display.textContent = parseFloat(e.target.value).toFixed(1);
                });
            }
        });
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('file-input');
        const loadFileBtn = document.getElementById('load-file-btn');

        loadFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Mouse events
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Toolbar buttons
        document.getElementById('reset-camera-btn')?.addEventListener('click', () => this.resetCamera());
        document.getElementById('wireframe-btn')?.addEventListener('click', () => this.toggleWireframe());
        document.getElementById('measure-btn')?.addEventListener('click', () => this.toggleMeasurementMode());
        document.getElementById('section-btn')?.addEventListener('click', () => this.toggleSectionMode());
        document.getElementById('explorer-btn')?.addEventListener('click', () => this.toggleExplorer());
        document.getElementById('viewpoint-btn')?.addEventListener('click', () => this.showViewpointsTab());
        document.getElementById('screenshot-btn')?.addEventListener('click', () => this.takeScreenshot());
        document.getElementById('annotation-btn')?.addEventListener('click', () => this.toggleAnnotationMode());
        document.getElementById('area-volume-btn')?.addEventListener('click', () => this.toggleAreaVolumeMode());
        document.getElementById('collision-btn')?.addEventListener('click', () => this.detectCollisions());
        document.getElementById('color-by-category-btn')?.addEventListener('click', () => this.colorByCategory());

        // Viewpoint export
        document.getElementById('export-viewpoints-btn')?.addEventListener('click', () => {
            this.viewpointManager.exportViewpoints();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.takeScreenshot();
        } else if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            this.viewpointManager.saveCurrentViewpoint();
        } else if (e.key === 'f' || e.key === 'F') {
            if (this.selectedObject) {
                this.focusOnObject(this.selectedObject);
            }
        } else if (e.key === 'h' || e.key === 'H') {
            if (this.selectedObject) {
                this.selectedObject.visible = !this.selectedObject.visible;
            }
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.innerHTML = '초기화 중... 0%';

        try {
            await this.ifcLoader.loadIFCFile(file, (percent) => {
                loading.innerHTML = `로딩 중... ${percent.toFixed(0)}%`;
            });

            loading.innerHTML = '모델 처리 및 분석 중...';
            this.updateStats();
            this.objectExplorer.analyzeScene();

            loading.style.display = 'none';
            loading.innerHTML = '로딩 중...';

            console.log('✓ File loaded and analyzed successfully');
        } catch (error) {
            console.error('✗ Error loading IFC file:', error);

            loading.style.display = 'none';
            loading.innerHTML = '로딩 중...';

            // 에러 메시지는 IFCLoader에서 이미 alert로 표시됨
        }
    }

    async onMouseClick(event) {
        if (this.measurementTool.isActive) {
            this.measurementTool.onClick(event);
            return;
        }

        if (this.annotationTool.isActive) {
            this.annotationTool.onClick(event);
            return;
        }

        if (this.areaVolumeTool.isActive) {
            this.areaVolumeTool.onClick(event);
            return;
        }

        // IFC 객체 선택
        const pickedObject = await this.objectSelector.pickIFCObject(event);

        if (pickedObject) {
            this.selectedObject = pickedObject.mesh;
            this.objectSelector.selectObject(pickedObject.mesh);
            this.displayIFCObjectProperties(pickedObject);
            console.log('✓ Selected IFC Object:', pickedObject.properties);
        } else {
            this.objectSelector.clearSelection();
            this.selectedObject = null;
            this.clearPropertyPanel();
        }
    }

    onMouseMove(event) {
        if (this.measurementTool.isActive) {
            this.measurementTool.onMouseMove(event);
        }
    }

    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    selectObject(object) {
        this.clearSelection();
        this.selectedObject = object;

        if (object.material) {
            object.userData.originalMaterial = object.material;
            const highlightMaterial = object.material.clone();
            highlightMaterial.emissive = new THREE.Color(0x0066cc);
            highlightMaterial.emissiveIntensity = 0.5;
            object.material = highlightMaterial;
        }

        this.displayObjectProperties(object);
    }

    clearSelection() {
        if (this.selectedObject && this.selectedObject.userData.originalMaterial) {
            this.selectedObject.material = this.selectedObject.userData.originalMaterial;
            this.selectedObject = null;
        }

        this.clearPropertyPanel();
    }

    clearPropertyPanel() {
        const propertiesContainer = document.getElementById('properties-container');
        propertiesContainer.innerHTML = '<p style="color: #666; font-size: 14px;">객체를 선택하면 정보가 표시됩니다</p>';
    }

    displayIFCObjectProperties(pickedObject) {
        const propertiesContainer = document.getElementById('properties-container');
        const props = pickedObject.properties;

        let html = '<h4 style="color: #0066cc; margin-bottom: 10px;">선택된 객체</h4>';

        // IFC 정보
        if (props.ifc && Object.keys(props.ifc).length > 0) {
            html += '<h5 style="color: #999; margin: 10px 0 5px 0;">IFC 정보</h5>';
            for (const [key, value] of Object.entries(props.ifc)) {
                html += `
                    <div class="property-item">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${value}</div>
                    </div>
                `;
            }
        }

        // 기본 정보
        if (props.basic && Object.keys(props.basic).length > 0) {
            html += '<h5 style="color: #999; margin: 10px 0 5px 0;">기본 정보</h5>';
            for (const [key, value] of Object.entries(props.basic)) {
                html += `
                    <div class="property-item">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${value}</div>
                    </div>
                `;
            }
        }

        // 위치 정보
        if (props.transform) {
            html += '<h5 style="color: #999; margin: 10px 0 5px 0;">위치 및 변환</h5>';
            for (const [key, value] of Object.entries(props.transform)) {
                html += `
                    <div class="property-item">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${value}</div>
                    </div>
                `;
            }
        }

        // 지오메트리 정보
        if (props.geometry) {
            html += '<h5 style="color: #999; margin: 10px 0 5px 0;">지오메트리</h5>';
            for (const [key, value] of Object.entries(props.geometry)) {
                html += `
                    <div class="property-item">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${value}</div>
                    </div>
                `;
            }
        }

        // 재질 정보
        if (props.material && Object.keys(props.material).length > 0) {
            html += '<h5 style="color: #999; margin: 10px 0 5px 0;">재질</h5>';
            for (const [key, value] of Object.entries(props.material)) {
                html += `
                    <div class="property-item">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${value}</div>
                    </div>
                `;
            }
        }

        // 면적과 부피 계산
        const object = pickedObject.mesh;
        if (object.geometry) {
            html += '<h5 style="color: #999; margin: 10px 0 5px 0;">측정</h5>';
            const area = this.areaVolumeTool.calculateObjectArea(object);
            const volume = this.areaVolumeTool.calculateObjectVolume(object);
            html += `
                <div class="property-item">
                    <div class="property-label">표면적</div>
                    <div class="property-value">${area.toFixed(2)} m²</div>
                </div>
                <div class="property-item">
                    <div class="property-label">부피</div>
                    <div class="property-value">${volume.toFixed(2)} m³</div>
                </div>
            `;
        }

        propertiesContainer.innerHTML = html;
    }

    displayObjectProperties(object) {
        const propertiesContainer = document.getElementById('properties-container');
        const properties = {
            '이름': object.name || '이름 없음',
            '타입': object.type,
            '위치 X': object.position.x.toFixed(2),
            '위치 Y': object.position.y.toFixed(2),
            '위치 Z': object.position.z.toFixed(2),
            '회전 X': THREE.MathUtils.radToDeg(object.rotation.x).toFixed(2) + '°',
            '회전 Y': THREE.MathUtils.radToDeg(object.rotation.y).toFixed(2) + '°',
            '회전 Z': THREE.MathUtils.radToDeg(object.rotation.z).toFixed(2) + '°',
            '스케일': `${object.scale.x.toFixed(2)} × ${object.scale.y.toFixed(2)} × ${object.scale.z.toFixed(2)}`
        };

        // Calculate area and volume
        if (object.geometry) {
            const area = this.areaVolumeTool.calculateObjectArea(object);
            const volume = this.areaVolumeTool.calculateObjectVolume(object);
            properties['표면적'] = area.toFixed(2) + ' m²';
            properties['부피'] = volume.toFixed(2) + ' m³';
        }

        let html = '';
        for (const [key, value] of Object.entries(properties)) {
            html += `
                <div class="property-item">
                    <div class="property-label">${key}</div>
                    <div class="property-value">${value}</div>
                </div>
            `;
        }

        propertiesContainer.innerHTML = html;
    }

    focusOnObject(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        cameraZ *= 1.5; // Add some margin

        const targetPosition = new THREE.Vector3(
            center.x + cameraZ,
            center.y + cameraZ,
            center.z + cameraZ
        );

        this.viewpointManager.animateCameraTo(targetPosition, center, 1000);
    }

    resetCamera() {
        this.camera.position.set(50, 50, 50);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    toggleWireframe() {
        this.wireframeMode = !this.wireframeMode;
        const btn = document.getElementById('wireframe-btn');

        this.scene.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.wireframe = this.wireframeMode;
            }
        });

        btn?.classList.toggle('active', this.wireframeMode);
    }

    toggleMeasurementMode() {
        this.measurementTool.toggle();
        const btn = document.getElementById('measure-btn');
        btn?.classList.toggle('active', this.measurementTool.isActive);
    }

    toggleSectionMode() {
        this.sectionTool.toggle();
        const btn = document.getElementById('section-btn');
        const control = document.getElementById('section-control');

        btn?.classList.toggle('active', this.sectionTool.isActive);
        if (control) {
            control.style.display = this.sectionTool.isActive ? 'block' : 'none';
        }
    }

    toggleExplorer() {
        const sidebarLeft = document.getElementById('sidebar-left');
        sidebarLeft?.classList.toggle('collapsed');
    }

    showViewpointsTab() {
        const viewpointTab = document.querySelector('[data-tab="viewpoints"]');
        viewpointTab?.click();
    }

    takeScreenshot() {
        this.screenshotTool.captureScreenshot('bim-viewer');
    }

    toggleAnnotationMode() {
        this.annotationTool.toggle();
        const btn = document.getElementById('annotation-btn');
        btn?.classList.toggle('active', this.annotationTool.isActive);
    }

    toggleAreaVolumeMode() {
        this.areaVolumeTool.toggle();
        const btn = document.getElementById('area-volume-btn');
        btn?.classList.toggle('active', this.areaVolumeTool.isActive);
    }

    async detectCollisions() {
        const meshes = [];
        this.scene.traverse((obj) => {
            if (obj.isMesh) meshes.push(obj);
        });

        const loading = document.getElementById('loading');
        loading.style.display = 'block';
        loading.textContent = '충돌 감지 중...';

        // Run in next frame to allow UI update
        await new Promise(resolve => setTimeout(resolve, 10));

        const collisions = this.collisionDetector.detectCollisions(meshes);
        this.collisionDetector.highlightCollisions();
        this.collisionDetector.displayReport();

        loading.style.display = 'none';
        loading.textContent = '로딩 중...';
    }

    colorByCategory() {
        this.objectExplorer.colorByCategory();
    }

    updateStats() {
        let triangleCount = 0;
        let objectCount = 0;

        this.scene.traverse((object) => {
            if (object.isMesh) {
                objectCount++;
                if (object.geometry) {
                    const positions = object.geometry.attributes.position;
                    if (positions) {
                        triangleCount += positions.count / 3;
                    }
                }
            }
        });

        document.getElementById('triangle-count').textContent = Math.floor(triangleCount).toLocaleString();
        document.getElementById('object-count').textContent = objectCount;
        document.getElementById('info-panel').style.display = 'block';
    }

    updateFPS() {
        this.frames++;
        const currentTime = performance.now();

        if (currentTime >= this.lastTime + 1000) {
            this.fps = Math.round((this.frames * 1000) / (currentTime - this.lastTime));
            this.frames = 0;
            this.lastTime = currentTime;
            document.getElementById('fps-count').textContent = this.fps;
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();
        this.measurementTool.update();
        this.annotationTool.update();
        this.updateFPS();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize viewer
window.addEventListener('DOMContentLoaded', () => {
    new AdvancedBIMViewer();
});
