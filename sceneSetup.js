import * as THREE from 'three';
import { createDynamicBackground } from './timeBasedBackground.js';

export function setupScene() {
    const scene = new THREE.Scene();
    
    // 1. Dynamic background
    const backgroundSystem = createDynamicBackground(scene);
    scene.userData.backgroundSystem = backgroundSystem;
    
    // 2. Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
    
    // 3. Enhanced grid system with multiple visualization modes
    const gridSystem = {
        mainGrid: createMainGrid(),
        yearGrids: new THREE.Group(),
        journalGrids: new THREE.Group(),
        currentMode: 'default'
    };
    
    scene.add(gridSystem.mainGrid);
    scene.add(gridSystem.yearGrids);
    scene.add(gridSystem.journalGrids);
    scene.userData.gridSystem = gridSystem;
    
    // 4. Initial bounds
    backgroundSystem.updateSize(
        new THREE.Vector3(-20, -5, -20),
        new THREE.Vector3(20, 15, 20)
    );
    
    return scene;
}

function createMainGrid() {
    const group = new THREE.Group();
    
    // Primary ground grid (more visible)
    const groundGrid = new THREE.GridHelper(30, 30, 0x888888, 0x444444);
    groundGrid.position.y = -0.01; // Slightly below objects
    groundGrid.name = 'GroundGrid';
    
    // Vertical grids for better spatial orientation
    const xzGrid = new THREE.GridHelper(30, 30, 0x666666, 0x333333);
    xzGrid.rotation.x = Math.PI / 2;
    xzGrid.position.y = 15;
    xzGrid.name = 'XZGrid';
    
    const yzGrid = new THREE.GridHelper(30, 30, 0x666666, 0x333333);
    yzGrid.rotation.z = Math.PI / 2;
    yzGrid.position.x = -15;
    yzGrid.name = 'YZGrid';
    
    group.add(groundGrid);
    group.add(xzGrid);
    group.add(yzGrid);
    
    return group;
}

export function updateGridForYearMode(scene, yearRange, articleCount, yearPositions) {
    const gridSystem = scene.userData.gridSystem;
    gridSystem.yearGrids.clear();

    // Calculate required grid dimensions based on year positions
    const minX = Math.min(...yearPositions.map(p => p.x));
    const maxX = Math.max(...yearPositions.map(p => p.x));
    const minY = Math.min(...yearPositions.map(p => p.y));
    const maxY = Math.max(...yearPositions.map(p => p.y));
    
    const gridWidth = maxX - minX + 10; // +10 for padding
    const gridDepth = maxY - minY + 10;
    const gridHeight = (yearRange.max - yearRange.min) * 2 + 5;

    // Create adaptive ground grid
    const groundGrid = new THREE.GridHelper(
        Math.max(gridWidth, gridDepth), // Size (square)
        Math.floor(Math.max(gridWidth, gridDepth) / 2), // Divisions
        0x888888, 0x444444
    );
    groundGrid.position.set(
        (minX + maxX) / 2, // Center X
        -0.01,             // Just below objects
        (minY + maxY) / 2  // Center Z
    );
    groundGrid.name = 'YearGroundGrid';
    gridSystem.yearGrids.add(groundGrid);

    // Create vertical grid planes that extend to contain all years
    const xzGrid = new THREE.GridHelper(
        gridWidth,
        Math.floor(gridWidth / 2),
        0x666666, 0x333333
    );
    xzGrid.rotation.x = Math.PI / 2;
    xzGrid.position.set(
        (minX + maxX) / 2,
        gridHeight / 2,
        maxY + 2 // Position just beyond furthest points
    );
    gridSystem.yearGrids.add(xzGrid);

    const yzGrid = new THREE.GridHelper(
        gridHeight,
        Math.floor(gridHeight / 2),
        0x666666, 0x333333
    );
    yzGrid.rotation.z = Math.PI / 2;
    yzGrid.position.set(
        minX - 2, // Position just before first points
        gridHeight / 2,
        (minY + maxY) / 2
    );
    gridSystem.yearGrids.add(yzGrid);

    // Add year markers along the YZ grid
    const yearSpan = yearRange.max - yearRange.min;
    const yearStep = Math.max(1, Math.floor(yearSpan / 10));
    
    for (let year = yearRange.min; year <= yearRange.max; year += yearStep) {
        const yPos = (year - yearRange.min) * 2;
        
        // Year label on YZ plane
        const label = createTextLabel(`${year}`, new THREE.Color(0xffffff));
        label.position.set(
            minX - 3, // Left of YZ grid
            yPos,
            (minY + maxY) / 2
        );
        gridSystem.yearGrids.add(label);
        
        // Tick mark on YZ grid
        const tickGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX - 0.5, yPos, (minY + maxY) / 2),
            new THREE.Vector3(minX - 1.5, yPos, (minY + maxY) / 2)
        ]);
        const tick = new THREE.Line(
            tickGeometry,
            new THREE.LineBasicMaterial({ color: 0xffffff })
        );
        gridSystem.yearGrids.add(tick);
    }

    // Set grid visibility
    gridSystem.mainGrid.visible = false;
    gridSystem.yearGrids.visible = true;
    gridSystem.journalGrids.visible = false;
    gridSystem.currentMode = 'year';

    // Update background bounds to contain everything
    updateSceneBackground(
        scene,
        new THREE.Vector3(minX - 5, -1, minY - 5),
        new THREE.Vector3(maxX + 5, gridHeight + 5, maxY + 5)
    );
}

export function updateGridForJournalMode(scene, journals) {
    const gridSystem = scene.userData.gridSystem;
    gridSystem.journalGrids.clear();
    
    // Create a grid plane for each journal
    journals.forEach((journal, index) => {
        const grid = new THREE.GridHelper(20, 20, 0x33aa33, 0x228822);
        grid.position.x = index * 25;
        grid.position.z = -10;
        
        // Add journal label
        const label = createTextLabel(shortenJournalName(journal.name), 0xffffff);
        label.position.set(index * 25, 0, -12);
        gridSystem.journalGrids.add(label);
        
        gridSystem.journalGrids.add(grid);
    });
    
    // Set grid visibility
    gridSystem.mainGrid.visible = false;
    gridSystem.yearGrids.visible = false;
    gridSystem.journalGrids.visible = true;
    gridSystem.currentMode = 'journal';
}

function createTextLabel(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.fillStyle = 'rgba(0,0,0,0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '24px Arial';
    context.fillStyle = `rgb(${color.r * 255},${color.g * 255},${color.b * 255})`;
    context.textAlign = 'center';
    context.fillText(text, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 2.5, 1);
    
    return sprite;
}

function shortenJournalName(name) {
    return name.length > 15 ? name.substring(0, 12) + '...' : name;
}
