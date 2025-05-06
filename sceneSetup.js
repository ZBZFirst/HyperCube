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

export function updateGridForYearMode(scene, yearRange, articleCount) {
    const gridSystem = scene.userData.gridSystem;
    
    // Clear previous year grids
    gridSystem.yearGrids.clear();
    
    // Calculate grid parameters based on data
    const yearSpan = yearRange.max - yearRange.min;
    const gridSpacing = Math.max(1, Math.floor(yearSpan / 10));
    const gridSize = Math.max(30, articleCount * 0.5);
    
    // Create year indicator grids
    for (let year = yearRange.min; year <= yearRange.max; year += gridSpacing) {
        const grid = new THREE.GridHelper(gridSize, 10, 0x3366ff, 0x2244aa);
        grid.position.y = (year - yearRange.min) * 2; // Scale for visibility
        grid.position.x = gridSize / 2;
        
        // Add year label
        const label = createTextLabel(`${year}`, 0xffffff);
        label.position.set(gridSize + 1, (year - yearRange.min) * 2, 0);
        gridSystem.yearGrids.add(label);
        
        gridSystem.yearGrids.add(grid);
    }
    
    // Set grid visibility
    gridSystem.mainGrid.visible = false;
    gridSystem.yearGrids.visible = true;
    gridSystem.journalGrids.visible = false;
    gridSystem.currentMode = 'year';
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
