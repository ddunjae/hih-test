import * as THREE from 'three';

export class CollisionDetector {
    constructor(scene) {
        this.scene = scene;
        this.collisions = [];
        this.threshold = 0.01; // Minimum distance to consider as collision
        this.isAnalyzing = false;
    }

    detectCollisions(objects) {
        this.collisions = [];
        this.isAnalyzing = true;

        const meshes = objects.filter(obj => obj.isMesh);

        for (let i = 0; i < meshes.length; i++) {
            for (let j = i + 1; j < meshes.length; j++) {
                const collision = this.checkCollision(meshes[i], meshes[j]);
                if (collision) {
                    this.collisions.push({
                        object1: meshes[i],
                        object2: meshes[j],
                        type: collision.type,
                        distance: collision.distance,
                        point: collision.point
                    });
                }
            }
        }

        this.isAnalyzing = false;
        return this.collisions;
    }

    checkCollision(obj1, obj2) {
        // First, quick bounding box check
        const box1 = new THREE.Box3().setFromObject(obj1);
        const box2 = new THREE.Box3().setFromObject(obj2);

        if (!box1.intersectsBox(box2)) {
            return null;
        }

        // More detailed check
        const distance = this.getMinimumDistance(obj1, obj2);

        if (distance < this.threshold) {
            return {
                type: 'intersection',
                distance: distance,
                point: this.getIntersectionPoint(obj1, obj2)
            };
        } else if (distance < 0.1) {
            return {
                type: 'near',
                distance: distance,
                point: this.getIntersectionPoint(obj1, obj2)
            };
        }

        return null;
    }

    getMinimumDistance(obj1, obj2) {
        // Simplified distance calculation using bounding boxes
        const box1 = new THREE.Box3().setFromObject(obj1);
        const box2 = new THREE.Box3().setFromObject(obj2);

        const center1 = box1.getCenter(new THREE.Vector3());
        const center2 = box2.getCenter(new THREE.Vector3());

        const size1 = box1.getSize(new THREE.Vector3());
        const size2 = box2.getSize(new THREE.Vector3());

        const centerDistance = center1.distanceTo(center2);
        const radii = (size1.length() + size2.length()) / 2;

        return Math.max(0, centerDistance - radii);
    }

    getIntersectionPoint(obj1, obj2) {
        const box1 = new THREE.Box3().setFromObject(obj1);
        const box2 = new THREE.Box3().setFromObject(obj2);

        const center1 = box1.getCenter(new THREE.Vector3());
        const center2 = box2.getCenter(new THREE.Vector3());

        // Midpoint between centers
        return new THREE.Vector3().addVectors(center1, center2).multiplyScalar(0.5);
    }

    highlightCollisions() {
        this.collisions.forEach(collision => {
            this.highlightObject(collision.object1, 0xff0000);
            this.highlightObject(collision.object2, 0xff0000);

            // Add marker at collision point
            this.addCollisionMarker(collision.point);
        });
    }

    highlightObject(object, color) {
        if (!object.userData.originalMaterial) {
            object.userData.originalMaterial = object.material;
        }

        const highlightMaterial = object.material.clone();
        highlightMaterial.emissive = new THREE.Color(color);
        highlightMaterial.emissiveIntensity = 0.5;
        object.material = highlightMaterial;
    }

    addCollisionMarker(position) {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.7
        });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        marker.userData.isCollisionMarker = true;
        this.scene.add(marker);
    }

    clearHighlights() {
        // Restore original materials
        this.scene.traverse((object) => {
            if (object.userData.originalMaterial) {
                object.material = object.userData.originalMaterial;
                delete object.userData.originalMaterial;
            }
        });

        // Remove markers
        const markers = this.scene.children.filter(obj => obj.userData.isCollisionMarker);
        markers.forEach(marker => this.scene.remove(marker));
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            totalCollisions: this.collisions.length,
            collisions: this.collisions.map((c, index) => ({
                id: index + 1,
                object1Name: c.object1.name || 'Unnamed',
                object2Name: c.object2.name || 'Unnamed',
                type: c.type,
                distance: c.distance.toFixed(3),
                position: {
                    x: c.point.x.toFixed(2),
                    y: c.point.y.toFixed(2),
                    z: c.point.z.toFixed(2)
                }
            }))
        };

        return report;
    }

    displayReport() {
        const report = this.generateReport();
        const panel = document.getElementById('collision-report');

        if (!panel) {
            this.createReportPanel();
            return this.displayReport();
        }

        panel.style.display = 'block';

        let html = `
            <div class="report-header">
                <h4>충돌 감지 결과</h4>
                <button class="close-btn" onclick="this.parentElement.parentElement.style.display='none'">×</button>
            </div>
            <div class="report-summary">
                <p>총 <strong>${report.totalCollisions}</strong>개의 충돌이 감지되었습니다.</p>
            </div>
            <div class="collision-list">
        `;

        if (report.totalCollisions === 0) {
            html += '<p style="color: #666;">충돌이 감지되지 않았습니다.</p>';
        } else {
            report.collisions.forEach(c => {
                const typeColor = c.type === 'intersection' ? '#ff0000' : '#ff9900';
                const typeText = c.type === 'intersection' ? '충돌' : '근접';

                html += `
                    <div class="collision-item">
                        <div class="collision-header">
                            <span class="collision-id">#${c.id}</span>
                            <span class="collision-type" style="background: ${typeColor}">${typeText}</span>
                        </div>
                        <div class="collision-details">
                            <p><strong>객체 1:</strong> ${c.object1Name}</p>
                            <p><strong>객체 2:</strong> ${c.object2Name}</p>
                            <p><strong>거리:</strong> ${c.distance}m</p>
                            <p><strong>위치:</strong> (${c.position.x}, ${c.position.y}, ${c.position.z})</p>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        panel.innerHTML = html;
    }

    createReportPanel() {
        const panel = document.createElement('div');
        panel.id = 'collision-report';
        panel.style.cssText = `
            position: absolute;
            top: 100px;
            left: 320px;
            background: rgba(45, 45, 45, 0.95);
            padding: 0;
            border-radius: 8px;
            color: white;
            width: 400px;
            max-height: 600px;
            overflow-y: auto;
            display: none;
            z-index: 100;
        `;
        document.getElementById('viewer-container').appendChild(panel);
    }

    exportReport() {
        const report = this.generateReport();
        const dataStr = JSON.stringify(report, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `collision-report-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    setThreshold(value) {
        this.threshold = value;
    }
}
