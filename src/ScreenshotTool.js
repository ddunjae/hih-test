export class ScreenshotTool {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
    }

    captureScreenshot(filename = 'screenshot') {
        // Render the scene
        this.renderer.render(this.scene, this.camera);

        // Get canvas data
        const canvas = this.renderer.domElement;

        // Convert to blob and download
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });

        this.showNotification('스크린샷 저장됨');
    }

    captureHighResScreenshot(scale = 2) {
        // Store original size
        const originalWidth = this.renderer.domElement.width;
        const originalHeight = this.renderer.domElement.height;

        // Set high resolution
        this.renderer.setSize(originalWidth * scale, originalHeight * scale);
        this.renderer.render(this.scene, this.camera);

        // Capture
        const canvas = this.renderer.domElement;
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `screenshot-hd-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);

            // Restore original size
            this.renderer.setSize(originalWidth, originalHeight);
        });

        this.showNotification('고해상도 스크린샷 저장됨');
    }

    capture360View(steps = 36) {
        const images = [];
        const originalRotation = this.camera.rotation.clone();
        const step = (Math.PI * 2) / steps;

        for (let i = 0; i < steps; i++) {
            this.camera.rotation.y = originalRotation.y + (step * i);
            this.renderer.render(this.scene, this.camera);
            images.push(this.renderer.domElement.toDataURL());
        }

        // Restore camera
        this.camera.rotation.copy(originalRotation);

        // Create zip or download separately
        this.downloadMultipleImages(images);
    }

    downloadMultipleImages(images) {
        images.forEach((dataUrl, index) => {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `360-view-${index}.png`;
            setTimeout(() => a.click(), index * 100);
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 102, 204, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}
