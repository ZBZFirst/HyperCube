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

let currentSortMode = 'default'; // 'default' or 'year'

export function sortByYear() {
    currentSortMode = 'year';
    positionCubes();
}

export function defaultSort() {
    currentSortMode = 'default';
    positionCubes();
}

function positionCubes() {
    const includedCubes = cubes.filter(c => c.userData.includeArticle === "true");
    
    if (currentSortMode === 'year') {
        // Year-based sorting (X=year, Y=article index)
        const cubesByYear = {};
        includedCubes.forEach(cube => {
            const year = cube.userData.PubYear || "Unknown";
            if (!cubesByYear[year]) cubesByYear[year] = [];
            cubesByYear[year].push(cube);
        });

        const years = Object.keys(cubesByYear).sort();
        years.forEach((year, yearIndex) => {
            cubesByYear[year].forEach((cube, articleIndex) => {
                cube.position.set(
                    yearIndex * 3.0,    // X: year
                    articleIndex * 1.5, // Y: article index
                    0                  // Z: fixed
                );
            });
        });
    } else {
        // Default grid sorting
        const gridSize = Math.ceil(Math.sqrt(includedCubes.length));
        includedCubes.forEach((cube, i) => {
            cube.position.set(
                (i % gridSize - gridSize/2) * 2.5, // X
                0,                                 // Y
                Math.floor(i / gridSize - gridSize/2) * 2.5 // Z
            );
        });
    }

    // Handle visibility
    cubes.forEach(cube => {
        cube.visible = cube.userData.includeArticle === "true";
    });
}

// Simplify deleteSelectedCube to just handle the cube removal
export function deleteSelectedCubes(selectedCubes) {
    selectedCubes.forEach(cube => {
        scene.remove(cube);
        const index = cubes.indexOf(cube);
        if (index !== -1) cubes.splice(index, 1);
    });
    return [];
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

export function highlightCubeByPmid(pmid, isSelected, selectedCubes = [], lastSelectedCube = null) {
    const cube = cubes.find(c => c.userData.pmid === pmid);
    if (!cube) return null;

    if (isSelected) {
        if (!selectedCubes.includes(cube)) {
            selectedCubes = [...selectedCubes, cube];
        }
        lastSelectedCube = cube;
    } else {
        selectedCubes = selectedCubes.filter(c => c !== cube);
    }

    // Update highlights
    cubes.forEach(c => {
        if (selectedCubes.includes(c)) {
            c.material.emissive.setHex(c === lastSelectedCube ? 0xFFD700 : 0x3498db);
        } else {
            c.material.emissive.setHex(0x000000);
        }
    });

    return { cube, selectedCubes, lastSelectedCube };
}

export function getCubes() {
    return cubes;
}

export function centerCameraOnCube(cube) {
    if (!cube || !cube.position || !camera) {
        console.warn('Cannot center camera - missing required elements');
        return;
    }
    
    try {
        const targetPosition = cube.position.clone();
        targetPosition.y += 1;
        targetPosition.z += 5;
        
        // Smooth camera movement
        camera.position.lerp(targetPosition, 0.1);
        camera.lookAt(cube.position);
    } catch (error) {
        console.error('Camera centering error:', error);
    }
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
