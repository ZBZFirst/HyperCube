// createScene.js
import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { setupCamera } from './cameraSetup.js';
import { setupRenderer } from './rendererSetup.js';
import { setupControls } from './controlsSetup.js';

export function createScene(container) {
    try {
        if (!container) {
            throw new Error('Graphics container not found!');
        }

        // Setup core Three.js components
        const scene = setupScene();
        const camera = setupCamera(container);
        const renderer = setupRenderer(container);
        
        // Make canvas focusable and set tabindex
        const canvas = renderer.domElement;
        canvas.tabIndex = 1;
        canvas.style.outline = 'none';
        
        return {
            scene,
            camera,
            renderer
        };
    } catch (error) {
        console.error('Scene creation failed:', error);
        return null;
    }
}
