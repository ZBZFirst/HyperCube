// sceneSetup.js start
import * as THREE from 'three';
import { createTimeBasedBackground } from './timeBasedBackground.js';

export function setupScene() {
    const scene = new THREE.Scene();
    
    // Add time-based background
    createTimeBasedBackground(scene);
    
    // Lighting (adjusted to work with dynamic background)
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Helpers
    scene.add(new THREE.GridHelper(20, 20));
    scene.add(new THREE.AxesHelper(5));
    
    return scene;
}
// sceneSetup.js end
