// cubeManager.js start
import * as THREE from 'three';
import { createCube } from './createCube.js';
import { applyPropertiesToCube } from './changeCube.js';

let cubes = [];
let selectedCube = null;

export function createCubesFromData(data, scene) {
    // Clear existing cubes
    cubes.forEach(cube => scene.remove(cube));
    cubes = [];

    // Create cubes in a grid layout
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
// cubeManager.js end
