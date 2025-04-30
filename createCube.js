    // createCube.js start
import * as THREE from 'three'; // Replace CDN URL with 'three'

export function createCube(data) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const cube = new THREE.Mesh(geometry, material);

    cube.userData = data;
    return cube;
}
    // createCube.js end
