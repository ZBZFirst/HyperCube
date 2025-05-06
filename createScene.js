import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { setupCamera } from './cameraSetup.js';
import { setupRenderer } from './rendererSetup.js';

export function createScene(container) {
    try {
        if (!container) {
            throw new Error('Graphics container not found!');
        }

        // 1. Setup core Three.js components
        const scene = setupScene();
        const camera = setupCamera(container);
        const renderer = setupRenderer(container);
        
        // 2. Configure canvas
        const canvas = renderer.domElement;
        canvas.tabIndex = 1;
        canvas.style.outline = 'none';
        
        // 3. Basic scene setup
        camera.position.set(0, 1.6, 5);
        camera.lookAt(0, 0, 0);
        
        // 4. Add basic lighting (in case sceneSetup fails)
        if (scene.children.filter(obj => obj.isLight).length === 0) {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
        }

        // 5. Add debug cube if in development
        if (process.env.NODE_ENV === 'development') {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);
        }

        return {
            scene,
            camera,
            renderer,
            canvas
        };
    } catch (error) {
        console.error('Scene creation failed:', error);
        return null;
    }
}
