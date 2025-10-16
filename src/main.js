import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { IFCLoader } from './IFCLoader.js';
import { ViewerControls } from './ViewerControls.js';
import { MeasurementTool } from './MeasurementTool.js';
import { SectionTool } from './SectionTool.js';
import { IFCObjectSelector } from './IFCObjectSelector.js';

class BIMViewer {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.selectedObject = null;
        this.wireframeMode = false;
        this.measurementTool = null;
        this.sectionTool = null;

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Scene 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        // Camera 설정
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(50, 50, 50);

        // Renderer 설정
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 조명 설정
        this.setupLights();

        // OrbitControls 설정
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;

        // Grid Helper
        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // Axes Helper
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);

        // Raycaster for object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // IFC Loader
        this.ifcLoader = new IFCLoader(this.scene);

        // IFC Object Selector
        this.objectSelector = new IFCObjectSelector(this.scene, this.camera, this.renderer.domElement, this.ifcLoader);

        // Tools
        this.measurementTool = new MeasurementTool(this.scene, this.camera, this.renderer.domElement);
        this.sectionTool = new SectionTool(this.scene, this.renderer);

        // Viewer Controls
        this.viewerControls = new ViewerControls(this);

        // Window resize handler
        window.addEventListener('resize', () => this.onWindowResize());

        // FPS Counter
        this.fps = 0;
        this.lastTime = performance.now();
        this.frames = 0;
    }

    setupLights() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional Light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        this.scene.add(directionalLight);

        // Hemisphere Light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        hemiLight.position.set(0, 100, 0);
        this.scene.add(hemiLight);
    }

    setupEventListeners() {
        // File input
        const fileInput = document.getElementById('file-input');
        const loadFileBtn = document.getElementById('load-file-btn');

        loadFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Mouse events for object selection
        this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));

        // Toolbar buttons
        document.getElementById('reset-camera-btn').addEventListener('click', () => this.resetCamera());
        document.getElementById('wireframe-btn').addEventListener('click', () => this.toggleWireframe());
        document.getElementById('measure-btn').addEventListener('click', () => this.toggleMeasurementMode());
        document.getElementById('section-btn').addEventListener('click', () => this.toggleSectionMode());
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

            loading.innerHTML = '모델 처리 중...';
            this.updateStats();

            loading.style.display = 'none';
            loading.innerHTML = '로딩 중...';

            console.log('✓ File loaded successfully');
        } catch (error) {
            console.error('✗ Error loading IFC file:', error);

            loading.style.display = 'none';
            loading.innerHTML = '로딩 중...';

            // 에러 메시지는 IFCLoader에서 이미 alert로 표시됨
            if (!error.message.includes('cancelled')) {
                // User cancelled는 alert 하지 않음
            }
        }
    }

    async onMouseClick(event) {
        if (this.measurementTool.isActive) {
            this.measurementTool.onClick(event);
            return;
        }

        // IFC 객체 선택
        const pickedObject = await this.objectSelector.pickIFCObject(event);

        if (pickedObject) {
            this.objectSelector.selectObject(pickedObject.mesh);
            this.displayIFCObjectProperties(pickedObject);
            console.log('Selected IFC Object:', pickedObject);
        } else {
            this.objectSelector.clearSelection();
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

        propertiesContainer.innerHTML = html;
    }

    clearPropertyPanel() {
        const propertiesContainer = document.getElementById('properties-container');
        propertiesContainer.innerHTML = '<p style="color: #666; font-size: 14px;">객체를 선택하면 정보가 표시됩니다</p>';
    }

    clearSelection() {
        this.objectSelector.clearSelection();
        this.clearPropertyPanel();
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

        btn.classList.toggle('active', this.wireframeMode);
    }

    toggleMeasurementMode() {
        this.measurementTool.toggle();
        const btn = document.getElementById('measure-btn');
        btn.classList.toggle('active', this.measurementTool.isActive);
    }

    toggleSectionMode() {
        this.sectionTool.toggle();
        const btn = document.getElementById('section-btn');
        const control = document.getElementById('section-control');

        btn.classList.toggle('active', this.sectionTool.isActive);
        control.style.display = this.sectionTool.isActive ? 'block' : 'none';
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
        this.updateFPS();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize viewer when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    new BIMViewer();
});
