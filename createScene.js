    // createScene.js start
import * as THREE from 'three';
import { setupCameraControls } from './cameraControls.js';

export function createScene() {
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

    // Camera and Renderer
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Setup controls
    const { controls, update } = setupCameraControls(camera, renderer);
    scene.add(controls.getObject());

    return { 
        scene,
        camera,
        renderer,
        updateControls: update
    };
}

    // createScene.js end
