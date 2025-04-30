// cubeManager.js start
import * as THREE from 'three';
import { createCube } from './createCube.js';
import { applyPropertiesToCube } from './changeCube.js';

let cubes = [];
let selectedCube = null;

export function createCubesFromData(data, scene) {
    cubes.forEach(cube => scene.remove(cube));
    cubes = [];
    const gridSize = Math.ceil(Math.sqrt(data.length));
    const spacing = 2.5;
    data.forEach((row, i) => {
        const x = (i % gridSize - gridSize/2) * spacing;
        const z = Math.floor(i / gridSize - gridSize/2) * spacing;
        const cube = createCube(row, data);
        cube.position.set(x, 0, z);
        cube.userData.pmid = row.PMID;
        scene.add(cube);
        cubes.push(cube);
    });
    return cubes;
}

export function highlightCubeByPmid(pmid) {
    if (selectedCube) {
        selectedCube.material.emissive.setHex(0x000000);
    } 
    selectedCube = cubes.find(c => c.userData.pmid === pmid);
    if (selectedCube) {
        selectedCube.material.emissive.setHex(0xffff00);
    }
    return selectedCube;
}

export function getCubes() {
    return cubes;
}

export function centerCameraOnCube(cube) {
    const targetPosition = cube.position.clone();
    targetPosition.y += 1;
    targetPosition.z += 5;
    camera.position.lerp(targetPosition, 0.1);
    camera.lookAt(cube.position);
}
// cubeManager.js end
