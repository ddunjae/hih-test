import * as THREE from 'three';

export class MeasurementTool {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.isActive = false;
        this.points = [];
        this.markers = [];
        this.lines = [];
        this.labels = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.tempMarker = null;
    }

    toggle() {
        this.isActive = !this.isActive;

        if (!this.isActive) {
            this.clear();
        } else {
            this.createTempMarker();
        }
    }

    createTempMarker() {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });
        this.tempMarker = new THREE.Mesh(geometry, material);
        this.tempMarker.visible = false;
        this.scene.add(this.tempMarker);
    }

    onClick(event) {
        if (!this.isActive) return;

        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point.clone();
            this.addPoint(point);

            if (this.points.length === 2) {
                this.createMeasurement();
                this.clear();
            }
        }
    }

    onMouseMove(event) {
        if (!this.isActive) return;

        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0 && this.tempMarker) {
            this.tempMarker.position.copy(intersects[0].point);
            this.tempMarker.visible = true;

            // If we have one point, show preview line
            if (this.points.length === 1) {
                this.updatePreviewLine(intersects[0].point);
            }
        } else if (this.tempMarker) {
            this.tempMarker.visible = false;
        }
    }

    updatePreviewLine(endPoint) {
        // Remove existing preview line
        if (this.previewLine) {
            this.scene.remove(this.previewLine);
        }

        const geometry = new THREE.BufferGeometry().setFromPoints([
            this.points[0],
            endPoint
        ]);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });
        this.previewLine = new THREE.Line(geometry, material);
        this.scene.add(this.previewLine);
    }

    updateMousePosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    addPoint(point) {
        this.points.push(point);

        // Create marker
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(point);
        this.scene.add(marker);
        this.markers.push(marker);
    }

    createMeasurement() {
        const distance = this.points[0].distanceTo(this.points[1]);

        // Create line
        const geometry = new THREE.BufferGeometry().setFromPoints(this.points);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.lines.push(line);

        // Create label
        const midPoint = new THREE.Vector3().addVectors(this.points[0], this.points[1]).multiplyScalar(0.5);
        this.createLabel(midPoint, `${distance.toFixed(2)}m`);

        console.log(`Distance: ${distance.toFixed(2)} meters`);
    }

    createLabel(position, text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'Bold 24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(5, 1.25, 1);

        this.scene.add(sprite);
        this.labels.push(sprite);
    }

    clear() {
        // Remove preview line
        if (this.previewLine) {
            this.scene.remove(this.previewLine);
            this.previewLine = null;
        }

        this.points = [];

        this.markers.forEach(marker => this.scene.remove(marker));
        this.markers = [];
    }

    clearAll() {
        this.clear();

        this.lines.forEach(line => this.scene.remove(line));
        this.lines = [];

        this.labels.forEach(label => this.scene.remove(label));
        this.labels = [];

        if (this.tempMarker) {
            this.scene.remove(this.tempMarker);
            this.tempMarker = null;
        }
    }

    update() {
        // Update label orientations to face camera
        this.labels.forEach(label => {
            label.lookAt(this.camera.position);
        });
    }
}
