import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

export function createCube(data) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const cube = new THREE.Mesh(geometry, material);

    cube.userData = data;
    return cube;
}
