import * as THREE from 'three';

export class AnnotationTool {
    constructor(scene, camera, domElement) {
        this.scene = scene;
        this.camera = camera;
        this.domElement = domElement;
        this.annotations = [];
        this.isActive = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    toggle() {
        this.isActive = !this.isActive;
        this.domElement.style.cursor = this.isActive ? 'crosshair' : 'default';
    }

    onClick(event) {
        if (!this.isActive) return;

        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const text = prompt('주석 내용을 입력하세요:');

            if (text) {
                this.addAnnotation(point, text);
            }
        }
    }

    addAnnotation(position, text, color = '#ff0000') {
        // Create marker sphere
        const markerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(position);

        // Create label
        const label = this.createLabel(text, color);
        label.position.copy(position);
        label.position.y += 1; // Offset above marker

        // Create line connecting marker to label
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            position,
            new THREE.Vector3(position.x, position.y + 1, position.z)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color });
        const line = new THREE.Line(lineGeometry, lineMaterial);

        // Group everything
        const annotationGroup = new THREE.Group();
        annotationGroup.add(marker);
        annotationGroup.add(label);
        annotationGroup.add(line);

        this.scene.add(annotationGroup);

        const annotation = {
            id: Date.now(),
            text,
            position: position.clone(),
            color,
            group: annotationGroup,
            marker,
            label,
            line,
            timestamp: new Date().toISOString()
        };

        this.annotations.push(annotation);
        this.updateAnnotationList();

        return annotation;
    }

    createLabel(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.roundRect(0, 0, canvas.width, canvas.height, 8);
        context.fill();

        // Border
        context.strokeStyle = color;
        context.lineWidth = 4;
        context.roundRect(0, 0, canvas.width, canvas.height, 8);
        context.stroke();

        // Text
        context.font = 'Bold 32px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Wrap text
        const words = text.split(' ');
        let line = '';
        let y = 40;
        const maxWidth = canvas.width - 40;

        words.forEach((word, i) => {
            const testLine = line + word + ' ';
            const metrics = context.measureText(testLine);

            if (metrics.width > maxWidth && i > 0) {
                context.fillText(line, canvas.width / 2, y);
                line = word + ' ';
                y += 40;
            } else {
                line = testLine;
            }
        });
        context.fillText(line, canvas.width / 2, y);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 2, 1);

        return sprite;
    }

    deleteAnnotation(id) {
        const index = this.annotations.findIndex(a => a.id === id);
        if (index === -1) return;

        const annotation = this.annotations[index];
        this.scene.remove(annotation.group);
        this.annotations.splice(index, 1);
        this.updateAnnotationList();
    }

    updateAnnotationList() {
        const listContainer = document.getElementById('annotations-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (this.annotations.length === 0) {
            listContainer.innerHTML = '<p style="color: #666; padding: 10px;">주석이 없습니다</p>';
            return;
        }

        this.annotations.forEach(annotation => {
            const item = document.createElement('div');
            item.className = 'annotation-item';

            const colorDot = document.createElement('span');
            colorDot.className = 'color-dot';
            colorDot.style.backgroundColor = annotation.color;

            const textSpan = document.createElement('span');
            textSpan.textContent = annotation.text;
            textSpan.className = 'annotation-text';
            textSpan.addEventListener('click', () => {
                this.focusOnAnnotation(annotation);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', () => {
                this.deleteAnnotation(annotation.id);
            });

            item.appendChild(colorDot);
            item.appendChild(textSpan);
            item.appendChild(deleteBtn);
            listContainer.appendChild(item);
        });
    }

    focusOnAnnotation(annotation) {
        // Animate camera to annotation
        const targetPosition = annotation.position.clone();
        targetPosition.y += 5;
        targetPosition.z += 5;

        // This would need to be implemented in the viewer
        console.log('Focus on annotation:', annotation);
    }

    updateMousePosition(event) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    update() {
        // Update label orientations to face camera
        this.annotations.forEach(annotation => {
            annotation.label.lookAt(this.camera.position);
        });
    }

    exportAnnotations() {
        const data = this.annotations.map(a => ({
            id: a.id,
            text: a.text,
            position: { x: a.position.x, y: a.position.y, z: a.position.z },
            color: a.color,
            timestamp: a.timestamp
        }));

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `annotations-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    importAnnotations(data) {
        data.forEach(item => {
            this.addAnnotation(
                new THREE.Vector3(item.position.x, item.position.y, item.position.z),
                item.text,
                item.color
            );
        });
    }

    clearAll() {
        this.annotations.forEach(annotation => {
            this.scene.remove(annotation.group);
        });
        this.annotations = [];
        this.updateAnnotationList();
    }
}

// Add roundRect to CanvasRenderingContext2D if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}
