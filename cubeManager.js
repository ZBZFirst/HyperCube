// cubeManager.js start
import * as THREE from 'three';
import { createCube, getGeometryScaleMode, GeometryScaleModes, getGeometryHeightForData, BASE_CUBE_HEIGHT } from './createCube.js';


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
let originalScales = new WeakMap();
let targetScaleY = new WeakMap();
let currentPositionMode = PositionModes.GRID;
let customPositioner = null;
const LAYOUT_ANNOTATIONS_NAME = 'LayoutAnnotations';

// Add this to your init function to ensure animation runs
export function initCubeManager(mainScene, mainCamera) {
    scene = mainScene;
    camera = mainCamera;
    
    // Start animation loop
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
        originalScales.set(cube, cube.scale.y);
        targetScaleY.set(cube, cube.scale.y);
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

export function updateGeometryScale() {
    cubes.forEach((cube) => {
        const nextHeight = getGeometryHeightForData(cube.userData);
        cube.userData.geometryHeight = nextHeight;
        cube.userData.geometryScaleMode = getGeometryScaleMode();
        targetScaleY.set(cube, nextHeight / BASE_CUBE_HEIGHT);
    });
    positionCubes();
}

function positionCubes() {
    const includedCubes = cubes.filter(c => c.userData.includeArticle === "true");
    
    // Store original positions
    cubes.forEach(cube => {
        originalPositions.set(cube, cube.position.clone());
        originalScales.set(cube, cube.scale.y);
        const nextHeight = getGeometryHeightForData(cube.userData);
        cube.userData.geometryHeight = nextHeight;
        cube.userData.geometryScaleMode = getGeometryScaleMode();
        targetScaleY.set(cube, nextHeight / BASE_CUBE_HEIGHT);
    });

    // Handle visibility immediately
    cubes.forEach(cube => {
        cube.visible = cube.userData.includeArticle === "true";
    });

    // Calculate target positions based on current mode
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

    // Ensure environment grows/shrinks with the new layout targets
    updateEnvironmentBounds(includedCubes);
    renderLayoutAnnotations(includedCubes);
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
    console.groupCollapsed(`[highlightCubeByPmid] pmid:${pmid} isSelected:${isSelected}`);
    console.log('Current selection state:', {
        selected: selectedCubes.map(c => c?.userData.pmid),
        last: lastSelectedCube?.userData.pmid
    });

    const cube = cubes.find(c => c.userData.pmid === pmid);
    if (!cube) {
        console.warn('Cube not found for pmid:', pmid);
        console.groupEnd();
        return null;
    }

    // Update selection state
    let newSelectedCubes = [...selectedCubes];
    let newLastSelectedCube = lastSelectedCube;

    if (isSelected) {
        if (!newSelectedCubes.includes(cube)) {
            newSelectedCubes.push(cube);
        }
        newLastSelectedCube = cube;
    } else {
        newSelectedCubes = newSelectedCubes.filter(c => c !== cube);
        if (newLastSelectedCube === cube) {
            newLastSelectedCube = newSelectedCubes.length > 0 ? newSelectedCubes[0] : null;
        }
    }

    console.log('New selection state:', {
        selected: newSelectedCubes.map(c => c.userData.pmid),
        last: newLastSelectedCube?.userData.pmid
    });

    // Update cube appearances
    cubes.forEach(c => {
        const materials = Array.isArray(c.material) ? c.material : [c.material];
        materials.forEach(mat => {
            if (mat.emissive) {
                if (newSelectedCubes.includes(c)) {
                    const isLastSelected = c === newLastSelectedCube;
                    mat.emissive.setHex(isLastSelected ? 0xFFD700 : 0x3498db);
                    mat.emissiveIntensity = 0.5;
                    console.log(`Highlighting cube ${c.userData.pmid} as ${isLastSelected ? 'last selected' : 'selected'}`);
                } else {
                    mat.emissive.setHex(0x000000);
                    mat.emissiveIntensity = 0;
                }
                mat.needsUpdate = true;
            }
        });
    });

    console.groupEnd();
    return { 
        cube, 
        selectedCubes: newSelectedCubes, 
        lastSelectedCube: newLastSelectedCube 
    };
}

export function getCubes() {
    return cubes;
}

// Add this function to update cube positions gradually
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

                const startScale = originalScales.get(cube) ?? cube.scale.y;
                const endScale = targetScaleY.get(cube) ?? cube.scale.y;
                cube.scale.y = THREE.MathUtils.lerp(startScale, endScale, easedProgress);
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
        let stackY = 0;
        const x = yearIndex * 3.0;

        cubesByYear[year].forEach((cube) => {
            const height = getCubeHeight(cube);
            const y = stackY + height / 2;
            stackY += height + 0.3;

            targetPositions.set(cube, new THREE.Vector3(x, y, 0));
        });
    });
}

function positionByJournal(cubes) {
    const cubesByJournal = {};
    cubes.forEach(cube => {
        const journal = cube.userData.Source || "Unknown";
        if (!cubesByJournal[journal]) cubesByJournal[journal] = [];
        cubesByJournal[journal].push(cube);
    });

    const journals = Object.keys(cubesByJournal).sort();
    journals.forEach((journal, journalIndex) => {
        const x = journalIndex * 3.2;
        const stack = cubesByJournal[journal];
        const zOffset = (stack.length - 1) * 0.6;

        stack.forEach((cube, stackIndex) => {
            const height = getCubeHeight(cube);
            const y = height / 2;
            const z = stackIndex * 1.2 - zOffset;

            targetPositions.set(cube, new THREE.Vector3(x, y, z));
        });
    });
}

function positionByCitations(cubes) {
    const cubesByCitation = {};
    cubes.forEach((cube) => {
        const citations = Number(cube.userData.Citations || 0);
        if (!cubesByCitation[citations]) cubesByCitation[citations] = [];
        cubesByCitation[citations].push(cube);
    });

    const citationValues = Object.keys(cubesByCitation)
        .map(Number)
        .sort((a, b) => a - b);

    citationValues.forEach((citationValue, citationIndex) => {
        const x = citationIndex * 3.1;
        const stack = cubesByCitation[citationValue];
        const zOffset = (stack.length - 1) * 0.6;

        stack.forEach((cube, stackIndex) => {
            const height = getCubeHeight(cube);
            const y = height / 2;
            const z = stackIndex * 1.2 - zOffset;

            targetPositions.set(cube, new THREE.Vector3(x, y, z));
        });
    });
}

function positionAsGrid(cubes) {
    const gridSize = Math.ceil(Math.sqrt(cubes.length));
    cubes.forEach((cube, i) => {
        targetPositions.set(cube, new THREE.Vector3(
            (i % gridSize - gridSize/2) * 2.5,
            getCubeHeight(cube) / 2,
            Math.floor(i / gridSize - gridSize/2) * 2.5
        ));
    });
}

function updateEnvironmentBounds(includedCubes) {
    if (!scene?.userData?.backgroundSystem?.updateSize) return;

    if (!includedCubes?.length) {
        scene.userData.backgroundSystem.updateSize(
            new THREE.Vector3(-20, -5, -20),
            new THREE.Vector3(20, 15, 20)
        );
        return;
    }

    const minBounds = new THREE.Vector3(Infinity, Infinity, Infinity);
    const maxBounds = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    includedCubes.forEach((cube) => {
        const targetPos = targetPositions.get(cube) || cube.position;
        const geometry = cube.geometry;
        const geometryParams = geometry?.parameters || {};

        const halfWidth = (geometryParams.width || 0.8) / 2;
        const halfHeight = (geometryParams.height || 0.8) / 2;
        const halfDepth = (geometryParams.depth || 0.8) / 2;

        minBounds.min(new THREE.Vector3(
            targetPos.x - halfWidth,
            targetPos.y - halfHeight,
            targetPos.z - halfDepth
        ));
        maxBounds.max(new THREE.Vector3(
            targetPos.x + halfWidth,
            targetPos.y + halfHeight,
            targetPos.z + halfDepth
        ));
    });

    scene.userData.backgroundSystem.updateSize(minBounds, maxBounds);
    updateGridHelper(minBounds, maxBounds);
}

function renderLayoutAnnotations(includedCubes) {
    clearLayoutAnnotations();
    if (!scene || !includedCubes?.length) return;

    const bounds = getTargetBounds(includedCubes);
    if (!bounds) return;

    const group = new THREE.Group();
    group.name = LAYOUT_ANNOTATIONS_NAME;

    addAxisGuides(group, bounds);

    switch (currentPositionMode) {
        case PositionModes.YEAR:
            addCategoryLabels(group, includedCubes, 'PubYear', 'Publication Year');
            break;
        case PositionModes.JOURNAL:
            addCategoryLabels(group, includedCubes, 'Source', 'Journal');
            break;
        case PositionModes.CITATIONS:
            addNumericLabels(group, includedCubes, 'Citations', 'Citations');
            break;
        case PositionModes.GRID:
        default:
            addGridLabels(group, bounds);
            break;
    }

    addScaleLegend(group, bounds, includedCubes);
    scene.add(group);
}

function clearLayoutAnnotations() {
    const existing = scene?.getObjectByName(LAYOUT_ANNOTATIONS_NAME);
    if (existing) {
        scene.remove(existing);
    }
}

function getTargetBounds(includedCubes) {
    if (!includedCubes?.length) return null;
    const minBounds = new THREE.Vector3(Infinity, Infinity, Infinity);
    const maxBounds = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

    includedCubes.forEach((cube) => {
        const targetPos = targetPositions.get(cube) || cube.position;
        const halfHeight = getCubeHeight(cube) / 2;
        minBounds.min(new THREE.Vector3(targetPos.x - 0.5, 0, targetPos.z - 0.5));
        maxBounds.max(new THREE.Vector3(targetPos.x + 0.5, targetPos.y + halfHeight, targetPos.z + 0.5));
    });

    return { minBounds, maxBounds };
}

function addAxisGuides(group, bounds) {
    const { minBounds, maxBounds } = bounds;
    const baseY = 0.05;
    const xStart = new THREE.Vector3(minBounds.x - 1.5, baseY, minBounds.z - 1.5);
    const xEnd = new THREE.Vector3(maxBounds.x + 1.5, baseY, minBounds.z - 1.5);
    const zEnd = new THREE.Vector3(minBounds.x - 1.5, baseY, maxBounds.z + 1.5);
    const yEnd = new THREE.Vector3(minBounds.x - 1.5, Math.max(maxBounds.y + 1.6, 4), minBounds.z - 1.5);

    group.add(createLine(xStart, xEnd, 0x2563eb));
    group.add(createLine(xStart, zEnd, 0x14b8a6));
    group.add(createLine(xStart, yEnd, 0xf97316));

    group.add(createTextSprite('X', xEnd.clone().add(new THREE.Vector3(0.6, 0.2, 0)), '#2563eb'));
    group.add(createTextSprite('Z', zEnd.clone().add(new THREE.Vector3(0, 0.2, 0.6)), '#0f766e'));
    group.add(createTextSprite('Y', yEnd.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ea580c'));
}

function addCategoryLabels(group, includedCubes, fieldName, axisTitle) {
    const categories = {};
    includedCubes.forEach((cube) => {
        const key = String(cube.userData[fieldName] || 'Unknown');
        if (!categories[key]) categories[key] = [];
        categories[key].push(cube);
    });

    const sortedKeys = Object.keys(categories).sort();
    const orderedLabels = sortedKeys.length > 12
        ? sortedKeys.filter((_, index) => index % Math.ceil(sortedKeys.length / 12) === 0)
        : sortedKeys;

    orderedLabels.forEach((key) => {
        const sampleCube = categories[key][0];
        const pos = targetPositions.get(sampleCube) || sampleCube.position;
        group.add(createTextSprite(shortLabel(key), new THREE.Vector3(pos.x, 0.2, pos.z - 2.2), '#1d4ed8'));
    });

    const firstCube = categories[sortedKeys[0]]?.[0];
    if (firstCube) {
        const pos = targetPositions.get(firstCube) || firstCube.position;
        group.add(createTextSprite(axisTitle, new THREE.Vector3(pos.x, 0.25, pos.z - 4), '#0f172a', 28));
    }
}

function addNumericLabels(group, includedCubes, fieldName, axisTitle) {
    const categories = {};
    includedCubes.forEach((cube) => {
        const key = Number(cube.userData[fieldName] || 0);
        if (!categories[key]) categories[key] = [];
        categories[key].push(cube);
    });

    const sortedKeys = Object.keys(categories).map(Number).sort((a, b) => a - b);
    const orderedLabels = sortedKeys.length > 10
        ? sortedKeys.filter((_, index) => index % Math.ceil(sortedKeys.length / 10) === 0)
        : sortedKeys;

    orderedLabels.forEach((value) => {
        const sampleCube = categories[value][0];
        const pos = targetPositions.get(sampleCube) || sampleCube.position;
        group.add(createTextSprite(String(value), new THREE.Vector3(pos.x, 0.2, pos.z - 2.2), '#1d4ed8'));
    });

    const firstCube = categories[sortedKeys[0]]?.[0];
    if (firstCube) {
        const pos = targetPositions.get(firstCube) || firstCube.position;
        group.add(createTextSprite(axisTitle, new THREE.Vector3(pos.x, 0.25, pos.z - 4), '#0f172a', 28));
    }
}

function addGridLabels(group, bounds) {
    const { minBounds, maxBounds } = bounds;
    const xMid = (minBounds.x + maxBounds.x) / 2;
    const zMid = (minBounds.z + maxBounds.z) / 2;
    group.add(createTextSprite('Grid X', new THREE.Vector3(xMid, 0.2, minBounds.z - 3), '#1d4ed8', 28));
    group.add(createTextSprite('Grid Z', new THREE.Vector3(minBounds.x - 3, 0.2, zMid), '#0f766e', 28));
}

function addScaleLegend(group, bounds, includedCubes) {
    const scaleMode = getGeometryScaleMode();
    const { minBounds, maxBounds } = bounds;
    const axisX = minBounds.x - 1.5;
    const axisZ = minBounds.z - 1.5;

    let axisTitle = 'Cube Height';
    if (scaleMode === GeometryScaleModes.AUTHOR_COUNT) {
        axisTitle = 'Author Count';
    } else if (scaleMode === GeometryScaleModes.MESH_COUNT) {
        axisTitle = 'MeSH Count';
    }

    const maxHeight = Math.max(...includedCubes.map((cube) => Math.ceil(getCubeHeight(cube))), 1);
    const tickStep = maxHeight > 12 ? 2 : 1;

    for (let tick = 1; tick <= maxHeight; tick += tickStep) {
        const y = tick;
        group.add(createLine(
            new THREE.Vector3(axisX - 0.15, y, axisZ),
            new THREE.Vector3(axisX + 0.15, y, axisZ),
            0xf97316
        ));
        group.add(createTextSprite(String(tick), new THREE.Vector3(axisX - 0.9, y, axisZ), '#ea580c'));
    }

    group.add(createTextSprite(axisTitle, new THREE.Vector3(axisX - 0.5, Math.max(maxBounds.y + 1.2, 3), axisZ), '#7c2d12', 28));
}

function createLine(start, end, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    return new THREE.Line(geometry, material);
}

function createTextSprite(text, position, color = '#0f172a', fontSize = 34) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255,255,255,0.88)';
    roundRect(context, 8, 18, canvas.width - 16, canvas.height - 36, 22);
    context.fill();
    context.strokeStyle = 'rgba(148,163,184,0.45)';
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = color;
    context.font = `700 ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(2.3, 0.72, 1);
    return sprite;
}

function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
}

function shortLabel(value) {
    if (!value) return 'Unknown';
    if (String(value).length <= 14) return String(value);
    return String(value)
        .split(' ')
        .map((part) => part.slice(0, 4))
        .join(' ')
        .slice(0, 18);
}

function updateGridHelper(minBounds, maxBounds) {
    const gridHelper = scene?.getObjectByName('MainGridHelper');
    if (!gridHelper) return;

    const spanX = Math.max(15, maxBounds.x - minBounds.x);
    const spanZ = Math.max(15, maxBounds.z - minBounds.z);
    const centerX = (minBounds.x + maxBounds.x) / 2;
    const centerZ = (minBounds.z + maxBounds.z) / 2;

    gridHelper.scale.set(spanX / 15, 1, spanZ / 15);
    gridHelper.position.set(centerX, 0, centerZ);
}

function getCubeHeight(cube) {
    return cube?.userData?.geometryHeight || BASE_CUBE_HEIGHT;
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

function updateButtonStates(selectedCubes) {
    const deleteBtn = document.getElementById('delete-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    if (!deleteBtn || !downloadBtn) return;
    
    const hasSelection = selectedCubes.length > 0;
    deleteBtn.disabled = !hasSelection;
    downloadBtn.disabled = !hasSelection;
}

// At the bottom of cubeManager.js
window.setPositionMode = setPositionMode;
window.PositionModes = PositionModes;
// cubeManager.js end
