// sceneSetup.js start
import * as THREE from 'three';

export function setupScene() {
    const scene = new THREE.Scene();
    
    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5));
    
    // Helpers
    scene.add(new THREE.GridHelper(20, 20));
    scene.add(new THREE.AxesHelper(5));
    
    return scene;
}
// sceneSetup.js end
