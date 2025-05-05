// cubeManager.js start
import * as THREE from 'three';
import { createCube } from './createCube.js';


const PositionModes = {
    GRID: 'grid',
    YEAR: 'year',
    JOURNAL: 'journal',
    CITATIONS: 'citations',
    CUSTOM: 'custom'
};


let cubes = [];
let selectedCube = null;
let camera;
let scene;
let animationStartTime = null;
const animationDuration = 4; // seconds
let isAnimating = false;
let originalPositions = new WeakMap();
let targetPositions = new WeakMap();
let currentPositionMode = PositionModes.GRID;
let customPositioner = null;
let selectedCubes = [];
let lastSelectedCube = null;

export function getSelectedCubes() {
    return selectedCubes;
}

export function clearSelections() {
    selectedCubes = [];
    lastSelectedCube = null;
    updateButtonStates();
}

export function initCubeManager(mainScene, mainCamera) {
    scene = mainScene;
    camera = mainCamera;
    
    function animationLoop() {
        if (isAnimating) {
            animateCubes();
        }
        requestAnimationFrame(animationLoop);
    }
    animationLoop();
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

export function setPositionMode(mode, customCallback = null) {
    if (Object.values(PositionModes).includes(mode)) {
        currentPositionMode = mode;
        if (mode === PositionModes.CUSTOM && customCallback) {
            customPositioner = customCallback;
        }
        positionCubes();
    }
}

function positionCubes() {
    const includedCubes = cubes.filter(c => c.userData.includeArticle === "true");
    
    cubes.forEach(cube => {
        originalPositions.set(cube, cube.position.clone());
    });

    cubes.forEach(cube => {
        cube.visible = cube.userData.includeArticle === "true";
    });

    switch(currentPositionMode) {
        case PositionModes.YEAR:
            positionByYear(includedCubes);
            break;
            
        case PositionModes.JOURNAL:
            positionByJournal(includedCubes);
            break;
            
        case PositionModes.CITATIONS:
            positionByCitations(includedCubes);
            break;
            
        case PositionModes.CUSTOM:
            if (customPositioner) customPositioner(includedCubes);
            break;
            
        default: // GRID
            positionAsGrid(includedCubes);
    }
    
    // Start animation
    animationStartTime = performance.now() / 1000;
    isAnimating = true;
    animateCubes();
}

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

    cubes.forEach(c => {
        try {
            const materials = Array.isArray(c.material) ? c.material : [c.material];
            materials.forEach(mat => {
                if (mat.emissive) {
                    mat.emissive.setHex(selectedCubes.includes(c) ? 
                        (c === lastSelectedCube ? 0xFFD700 : 0x3498db) : 0x000000);
                    mat.emissiveIntensity = selectedCubes.includes(c) ? 0.5 : 0;
                    mat.needsUpdate = true;
                }
            });
        } catch (e) {
            console.warn('Failed to update cube highlight:', e);
        }
    });

    updateButtonStates();

    return { cube };
}

export function getCubes() {
    return cubes;
}

function animateCubes() {
    if (!isAnimating) return;
    
    const currentTime = performance.now() / 1000; // convert to seconds
    const elapsed = currentTime - animationStartTime;
    const progress = Math.min(elapsed / animationDuration, 1);
    
    cubes.forEach(cube => {
        if (targetPositions.has(cube)) {
            const startPos = originalPositions.get(cube);
            const endPos = targetPositions.get(cube);
            
            if (startPos && endPos) {
                // Use easing for smoother animation (e.g., easeOutCubic)
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                cube.position.lerpVectors(
                    startPos,
                    endPos,
                    easedProgress
                );
            }
        }
    });
    
    if (progress >= 1) {
        isAnimating = false;
    } else {
        requestAnimationFrame(animateCubes);
    }
}

function positionByYear(cubes) {
    const cubesByYear = {};
    cubes.forEach(cube => {
        const year = cube.userData.PubYear || "Unknown";
        if (!cubesByYear[year]) cubesByYear[year] = [];
        cubesByYear[year].push(cube);
    });

    const years = Object.keys(cubesByYear).sort();
    years.forEach((year, yearIndex) => {
        cubesByYear[year].forEach((cube, articleIndex) => {
            targetPositions.set(cube, new THREE.Vector3(
                yearIndex * 3.0,
                articleIndex * 1.5,
                0
            ));
        });
    });
}

function positionByJournal(cubes) {
    const cubesByJournal = {};
    cubes.forEach(cube => {
        const journal = cube.userData.Journal || "Unknown";
        if (!cubesByJournal[journal]) cubesByJournal[journal] = [];
        cubesByJournal[journal].push(cube);
    });

    const journals = Object.keys(cubesByJournal).sort();
    const radius = journals.length * 1.5;
    
    journals.forEach((journal, journalIndex) => {
        const angle = (journalIndex / journals.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        cubesByJournal[journal].forEach((cube, articleIndex) => {
            targetPositions.set(cube, new THREE.Vector3(
                x + (Math.random() - 0.5) * 2,
                articleIndex * 0.8,
                z + (Math.random() - 0.5) * 2
            ));
        });
    });
}

function positionByCitations(cubes) {
    const sorted = [...cubes].sort((a, b) => 
        (b.userData.Citations || 0) - (a.userData.Citations || 0));
    
    const spiralRadius = 10;
    const heightScale = 0.1;
    
    sorted.forEach((cube, i) => {
        const angle = i * 0.2;
        const radius = spiralRadius * (1 - i/sorted.length);
        const citations = cube.userData.Citations || 0;
        
        targetPositions.set(cube, new THREE.Vector3(
            Math.cos(angle) * radius,
            citations * heightScale,
            Math.sin(angle) * radius
        ));
    });
}

function positionAsGrid(cubes) {
    const gridSize = Math.ceil(Math.sqrt(cubes.length));
    cubes.forEach((cube, i) => {
        targetPositions.set(cube, new THREE.Vector3(
            (i % gridSize - gridSize/2) * 2.5,
            0,
            Math.floor(i / gridSize - gridSize/2) * 2.5
        ));
    });
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
        
        camera.position.lerp(targetPosition, 0.1);
        camera.lookAt(cube.position);
    } catch (error) {
        console.error('Camera centering error:', error);
    }
}

export function updateButtonStates() {
    const deleteBtn = document.getElementById('delete-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    if (!deleteBtn || !downloadBtn) return;
    
    const hasSelection = selectedCubes.length > 0;
    deleteBtn.disabled = !hasSelection;
    downloadBtn.disabled = !hasSelection;
}

window.setPositionMode = setPositionMode;
window.PositionModes = PositionModes;
// cubeManager.js end
