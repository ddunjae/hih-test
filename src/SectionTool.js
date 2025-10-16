import * as THREE from 'three';

export class SectionTool {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.isActive = false;
        this.planes = [];
        this.helpers = [];

        this.setupSectionPlanes();
        this.setupControls();
    }

    setupSectionPlanes() {
        // Create clipping planes for X, Y, Z axes
        this.planeX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
        this.planeY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
        this.planeZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

        this.planes = [this.planeX, this.planeY, this.planeZ];

        // Create helpers
        this.helperX = new THREE.PlaneHelper(this.planeX, 50, 0xff0000);
        this.helperY = new THREE.PlaneHelper(this.planeY, 50, 0x00ff00);
        this.helperZ = new THREE.PlaneHelper(this.planeZ, 50, 0x0000ff);

        this.helpers = [this.helperX, this.helperY, this.helperZ];

        this.helpers.forEach(helper => {
            helper.visible = false;
            this.scene.add(helper);
        });
    }

    setupControls() {
        const controlX = document.getElementById('section-x');
        const controlY = document.getElementById('section-y');
        const controlZ = document.getElementById('section-z');

        controlX.addEventListener('input', (e) => {
            this.planeX.constant = parseFloat(e.target.value);
        });

        controlY.addEventListener('input', (e) => {
            this.planeY.constant = parseFloat(e.target.value);
        });

        controlZ.addEventListener('input', (e) => {
            this.planeZ.constant = parseFloat(e.target.value);
        });
    }

    toggle() {
        this.isActive = !this.isActive;

        if (this.isActive) {
            this.enable();
        } else {
            this.disable();
        }
    }

    enable() {
        // Enable clipping
        this.renderer.localClippingEnabled = true;

        // Apply clipping planes to all meshes
        this.scene.traverse((child) => {
            if (child.isMesh) {
                child.material.clippingPlanes = this.planes;
                child.material.clipShadows = true;
                child.material.needsUpdate = true;
            }
        });

        // Show helpers
        this.helpers.forEach(helper => helper.visible = true);
    }

    disable() {
        // Disable clipping
        this.renderer.localClippingEnabled = false;

        // Remove clipping planes from meshes
        this.scene.traverse((child) => {
            if (child.isMesh && child.material.clippingPlanes) {
                child.material.clippingPlanes = [];
                child.material.needsUpdate = true;
            }
        });

        // Hide helpers
        this.helpers.forEach(helper => helper.visible = false);

        // Reset sliders
        document.getElementById('section-x').value = 0;
        document.getElementById('section-y').value = 0;
        document.getElementById('section-z').value = 0;

        // Reset planes
        this.planeX.constant = 0;
        this.planeY.constant = 0;
        this.planeZ.constant = 0;
    }

    setPlane(axis, value) {
        switch(axis) {
            case 'x':
                this.planeX.constant = value;
                break;
            case 'y':
                this.planeY.constant = value;
                break;
            case 'z':
                this.planeZ.constant = value;
                break;
        }
    }
}
