// sceneSetup.js start
import * as THREE from 'three';
import { createDynamicBackground } from './timeBasedBackground.js';

export function setupScene() {
    const scene = new THREE.Scene();
    
    // 1. Create dynamic background system and store reference
    const backgroundSystem = createDynamicBackground(scene);
    scene.userData.backgroundSystem = backgroundSystem;
    
    // 2. Lighting setup optimized for the cube background
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    ambientLight.name = 'MainAmbientLight';
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.name = 'MainDirectionalLight';
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    
    // 3. Helpers (smaller size to match typical content)
    const gridHelper = new THREE.GridHelper(15, 15, 0x555555, 0x333333);
    gridHelper.name = 'MainGridHelper';
    scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.name = 'MainAxesHelper';
    scene.add(axesHelper);
    
    // 4. Set initial background bounds (will be updated when content loads)
    backgroundSystem.updateSize(
        new THREE.Vector3(-20, -5, -20), // Min bounds
        new THREE.Vector3(20, 15, 20)    // Max bounds
    );
    
    console.log('[Scene] Scene initialized with dynamic background cube');
    return scene;
}

// Export background update function for other modules
export function updateSceneBackground(scene, minBounds, maxBounds) {
    if (scene.userData.backgroundSystem?.updateSize) {
        scene.userData.backgroundSystem.updateSize(minBounds, maxBounds);
    } else {
        console.warn('Background system not available for update');
    }
}
// sceneSetup.js end
