    // createScene.js start
import * as THREE from 'three';

export function createScene() {
    const scene = new THREE.Scene();
    
    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5));

    // Helpers
    scene.add(new THREE.GridHelper(60, 20));
    scene.add(new THREE.AxesHelper(5));

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    return { scene, camera, renderer };
}


    // createScene.js end
