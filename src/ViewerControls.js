export class ViewerControls {
    constructor(viewer) {
        this.viewer = viewer;
        this.setupKeyboardControls();
    }

    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    handleKeyDown(event) {
        const moveSpeed = 5;
        const rotateSpeed = 0.1;

        switch(event.key) {
            case 'w':
            case 'W':
                this.viewer.camera.position.z -= moveSpeed;
                break;
            case 's':
            case 'S':
                this.viewer.camera.position.z += moveSpeed;
                break;
            case 'a':
            case 'A':
                this.viewer.camera.position.x -= moveSpeed;
                break;
            case 'd':
            case 'D':
                this.viewer.camera.position.x += moveSpeed;
                break;
            case 'q':
            case 'Q':
                this.viewer.camera.position.y += moveSpeed;
                break;
            case 'e':
            case 'E':
                this.viewer.camera.position.y -= moveSpeed;
                break;
            case 'r':
            case 'R':
                this.viewer.resetCamera();
                break;
            case 'Escape':
                this.viewer.clearSelection();
                if (this.viewer.measurementTool.isActive) {
                    this.viewer.toggleMeasurementMode();
                }
                if (this.viewer.sectionTool.isActive) {
                    this.viewer.toggleSectionMode();
                }
                break;
        }
    }
}
