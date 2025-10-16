import * as THREE from 'three';

export class AreaVolumeTool {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.isActive = false;
        this.mode = 'area'; // 'area' or 'volume'
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    calculateObjectArea(object) {
        if (!object.geometry) return 0;

        const geometry = object.geometry;
        let area = 0;

        if (geometry.index) {
            const positions = geometry.attributes.position;
            const indices = geometry.index.array;

            for (let i = 0; i < indices.length; i += 3) {
                const v1 = new THREE.Vector3().fromBufferAttribute(positions, indices[i]);
                const v2 = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 1]);
                const v3 = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 2]);

                area += this.calculateTriangleArea(v1, v2, v3);
            }
        } else {
            const positions = geometry.attributes.position;

            for (let i = 0; i < positions.count; i += 3) {
                const v1 = new THREE.Vector3().fromBufferAttribute(positions, i);
                const v2 = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
                const v3 = new THREE.Vector3().fromBufferAttribute(positions, i + 2);

                area += this.calculateTriangleArea(v1, v2, v3);
            }
        }

        // Apply object scale
        const scale = object.scale;
        area *= scale.x * scale.y;

        return area;
    }

    calculateTriangleArea(v1, v2, v3) {
        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const cross = new THREE.Vector3().crossVectors(edge1, edge2);
        return cross.length() / 2;
    }

    calculateObjectVolume(object) {
        if (!object.geometry) return 0;

        const geometry = object.geometry;

        // Calculate volume using the divergence theorem
        // For a closed mesh, sum of signed volumes of tetrahedra formed with origin
        let volume = 0;

        if (geometry.index) {
            const positions = geometry.attributes.position;
            const indices = geometry.index.array;

            for (let i = 0; i < indices.length; i += 3) {
                const v1 = new THREE.Vector3().fromBufferAttribute(positions, indices[i]);
                const v2 = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 1]);
                const v3 = new THREE.Vector3().fromBufferAttribute(positions, indices[i + 2]);

                volume += this.signedVolumeOfTriangle(v1, v2, v3);
            }
        } else {
            const positions = geometry.attributes.position;

            for (let i = 0; i < positions.count; i += 3) {
                const v1 = new THREE.Vector3().fromBufferAttribute(positions, i);
                const v2 = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
                const v3 = new THREE.Vector3().fromBufferAttribute(positions, i + 2);

                volume += this.signedVolumeOfTriangle(v1, v2, v3);
            }
        }

        // Apply object scale
        const scale = object.scale;
        volume *= scale.x * scale.y * scale.z;

        return Math.abs(volume);
    }

    signedVolumeOfTriangle(v1, v2, v3) {
        return v1.dot(new THREE.Vector3().crossVectors(v2, v3)) / 6.0;
    }

    calculateBoundingBoxVolume(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        return size.x * size.y * size.z;
    }

    calculateSurfaceArea(object) {
        // Calculate only the visible surface area
        return this.calculateObjectArea(object);
    }

    onClick(event) {
        if (!this.isActive) return;

        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            this.analyzeObject(object);
        }
    }

    analyzeObject(object) {
        const area = this.calculateObjectArea(object);
        const volume = this.calculateObjectVolume(object);
        const boundingVolume = this.calculateBoundingBoxVolume(object);

        const results = {
            name: object.name || 'Unnamed Object',
            surfaceArea: area.toFixed(2),
            volume: volume.toFixed(2),
            boundingBoxVolume: boundingVolume.toFixed(2),
            units: 'm' // Assuming meters
        };

        this.displayResults(results);
        return results;
    }

    displayResults(results) {
        const panel = document.getElementById('measurement-results');
        if (!panel) {
            this.createResultsPanel();
            return this.displayResults(results);
        }

        panel.style.display = 'block';
        panel.innerHTML = `
            <div class="measurement-header">
                <h4>계산 결과</h4>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="measurement-content">
                <div class="result-item">
                    <span class="result-label">객체 이름:</span>
                    <span class="result-value">${results.name}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">표면적:</span>
                    <span class="result-value">${results.surfaceArea} ${results.units}²</span>
                </div>
                <div class="result-item">
                    <span class="result-label">부피:</span>
                    <span class="result-value">${results.volume} ${results.units}³</span>
                </div>
                <div class="result-item">
                    <span class="result-label">경계 상자 부피:</span>
                    <span class="result-value">${results.boundingBoxVolume} ${results.units}³</span>
                </div>
            </div>
        `;
    }

    createResultsPanel() {
        const panel = document.createElement('div');
        panel.id = 'measurement-results';
        panel.style.cssText = `
            position: absolute;
            top: 100px;
            right: 20px;
            background: rgba(45, 45, 45, 0.95);
            padding: 0;
            border-radius: 8px;
            color: white;
            min-width: 300px;
            display: none;
            z-index: 100;
        `;
        document.getElementById('viewer-container').appendChild(panel);
    }

    calculateMultipleObjects(objects) {
        let totalArea = 0;
        let totalVolume = 0;

        objects.forEach(object => {
            if (object.isMesh) {
                totalArea += this.calculateObjectArea(object);
                totalVolume += this.calculateObjectVolume(object);
            }
        });

        return {
            totalArea: totalArea.toFixed(2),
            totalVolume: totalVolume.toFixed(2),
            objectCount: objects.length
        };
    }

    updateMousePosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    toggle() {
        this.isActive = !this.isActive;
        this.domElement.style.cursor = this.isActive ? 'help' : 'default';
    }

    exportResults(results) {
        const dataStr = JSON.stringify(results, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `measurements-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }
}
