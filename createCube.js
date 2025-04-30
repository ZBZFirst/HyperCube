    // createCube.js start
import * as THREE from 'three';

export function createCube(data) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0x00ffcc,
    metalness: 0.3,
    roughness: 0.7,
    emissive: 0x000000 // Will be used for highlighting
  });
  
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  
  // Store all CSV data in the cube
  cube.userData = data;
  
  return cube;
}
    // createCube.js end
