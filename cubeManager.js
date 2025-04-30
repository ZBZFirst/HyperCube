// cubeManager.js start
import * as THREE from 'three';
import { createCube } from './createCube.js';

let cubes = [];
let selectedCube = null;
let camera;

export function createCubesFromData(data, scene) {
    cubes.forEach(cube => scene.remove(cube));
    cubes = [];
    
    data.forEach((row, i) => {
        const cube = createCube(row, data);
        cube.userData.pmid = row.PMID;
        cube.userData.includeArticle = row.includeArticle || "true";
        scene.add(cube);
        cubes.push(cube);
        updateCubeVisibility(cube);
    });
    
    positionCubes();
    return cubes;
}

export function positionCubes() {
    const includedCubes = cubes.filter(c => c.userData.includeArticle === "true");
    const gridSize = Math.ceil(Math.sqrt(includedCubes.length));
    const spacing = 2.5;
    
    includedCubes.forEach((cube, i) => {
        const x = (i % gridSize - gridSize/2) * spacing;
        const z = Math.floor(i / gridSize - gridSize/2) * spacing;
        cube.position.set(x, 0, z);
        cube.visible = true;
    });
    
    cubes.filter(c => c.userData.includeArticle !== "true").forEach(cube => {
        cube.visible = false;
    });
}

export function deleteSelectedCube() {
    if (!selectedCube) return;
    
    // Find and remove from data array
    const dataIndex = data.findIndex(d => d.PMID === selectedCube.userData.pmid);
    if (dataIndex !== -1) {
        data.splice(dataIndex, 1);
    }
    
    // Remove from Three.js scene
    scene.remove(selectedCube);
    
    // Remove from cubes array
    const cubeIndex = cubes.indexOf(selectedCube);
    if (cubeIndex !== -1) {
        cubes.splice(cubeIndex, 1);
    }
    
    selectedCube = null;
    positionCubes(); // Reorganize remaining cubes
}

export function toggleIncludeArticle(pmid) {
    const cube = cubes.find(c => c.userData.pmid === pmid);
    if (cube) {
        cube.userData.includeArticle = cube.userData.includeArticle === "true" ? "false" : "true";
        updateCubeVisibility(cube);
        positionCubes();
    }
}

export function updateCubeVisibility(cube) {
    cube.material.opacity = cube.userData.includeArticle === "true" ? 0.9 : 0.3;
    cube.material.transparent = true;
    cube.material.needsUpdate = true;
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
