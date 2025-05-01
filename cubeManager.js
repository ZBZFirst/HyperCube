// cubeManager.js start
import * as THREE from 'three';
import { createCube } from './createCube.js';

let cubes = [];
let selectedCube = null;
let camera;
let scene;

export function initCubeManager(mainScene, mainCamera) {
    scene = mainScene;
    camera = mainCamera;
}

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

// Simplify deleteSelectedCube to just handle the cube removal
export function deleteSelectedCubes() {
    // Remove all selected cubes from scene
    selectedCubes.forEach(cube => {
        scene.remove(cube);
        const index = cubes.indexOf(cube);
        if (index !== -1) cubes.splice(index, 1);
    });
    
    selectedCubes = [];
    lastSelectedCube = null;
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

export function highlightCubeByPmid(pmid, isSelected) {
    const cube = cubes.find(c => c.userData.pmid === pmid);
    if (!cube) return null;

    if (isSelected) {
        // Add to selected cubes if not already there
        if (!selectedCubes.includes(cube)) {
            selectedCubes.push(cube);
        }
        lastSelectedCube = cube; // Track most recent selection
    } else {
        // Remove from selected cubes
        selectedCubes = selectedCubes.filter(c => c !== cube);
    }

    // Update all highlights
    selectedCubes.forEach(c => {
        // Gold for most recent, blue for others
        c.material.emissive.setHex(c === lastSelectedCube ? 0xFFD700 : 0x3498db);
    });
    
    // Clear highlights for deselected cubes
    cubes.filter(c => !selectedCubes.includes(c)).forEach(c => {
        c.material.emissive.setHex(0x000000);
    });

    return cube;
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

function updateButtonStates() {
    const deleteBtn = document.getElementById('delete-btn');
    if (selectedCube) {
        deleteBtn.disabled = false;
    } else {
        deleteBtn.disabled = true;
    }
}
// cubeManager.js end
