    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI } from './uiManager.js';
import { loadData, exportFilteredData, populateDataTable, updateTextZone } from './dataManager.js';
import { 
    createCubesFromData, 
    deleteSelectedCube,
    getCubes,
    updateCubeVisibility,
    positionCubes,
    centerCameraOnCube,
    highlightCubeByPmid
} from './cubeManager.js';

let scene, renderer, sceneObjects;
let cubes = [];

async function init() {
    try {
        // 1. First create the scene and renderer
        sceneObjects = createScene();
        scene = sceneObjects.scene;
        renderer = sceneObjects.renderer;
        
        // 2. Load data
        const data = await loadData("pubmed_data.csv");
        if (!data || data.length === 0) {
            throw new Error("No data loaded - check your CSV file");
        }

        // 3. Create cubes
        cubes = createCubesFromData(data, scene);
        
        // 4. Initialize UI
        populateDataTable(
          data, 
          (pmid) => {
            selectedCube = highlightCubeByPmid(pmid, true);
            if (selectedCube) {
              centerCameraOnCube(selectedCube);
            }
          }, 
          highlightCubeByPmid // Pass the highlight function as third parameter
        );
        
        // 5. Start animation
        startAnimationLoop();

    } catch (error) {
        console.error("Initialization failed:", error);
        alert(`Error: ${error.message}`);
        createFallbackScene();
    }
}

// Helper functions
function initializeUI(data) {
    return createUI(data, {
        onSelect: handleSelect,
        onExport: () => exportFilteredData(),
        onDelete: handleDelete,
        // ... other callbacks
    });
}

function handleSelect(pmid) {
    selectedCube = highlightCubeByPmid(pmid);
    if (selectedCube) {
        centerCameraOnCube(selectedCube);
    }
}

function handleDelete(ui, data) {
    deleteSelectedCube();
    updateTableData(ui, data);
    positionCubes(); // Reorganize remaining cubes
}

function updateTableData(ui, data) {
    ui.updateTable(data.filter(d => 
        getCubes().some(c => c.userData.pmid === d.PMID)
    ));
}


function startAnimationLoop() {
    function animate() {
        requestAnimationFrame(animate);
        sceneObjects.updateControls(0.016);
        renderer.render(scene, sceneObjects.camera);
    }
    animate();
}

// UI feedback functions
function showLoadingIndicator() {
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.style.position = 'fixed';
    loader.style.top = '20px';
    loader.style.right = '20px';
    loader.style.padding = '10px';
    loader.style.background = 'rgba(0,0,0,0.7)';
    loader.style.color = 'white';
    loader.style.borderRadius = '5px';
    loader.textContent = 'Loading...';
    document.body.appendChild(loader);
    return loader;
}

function removeLoadingIndicator(loader) {
    if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
    }
}

function showErrorToUser(message) {
    alert(`Error: ${message}`);
}

function createFallbackScene() {
    // Basic fallback visualization
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 5;
    
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

// Setup button handlers
document.getElementById('download-btn').addEventListener('click', async () => {
    try {
        await exportFilteredData();
    } catch (error) {
        console.error("Export failed:", error);
    }
});

document.getElementById('delete-btn').addEventListener('click', () => {
    if (!selectedCube) {
        alert("Please select an article first");
        return;
    }
    deleteSelectedCube();
    selectedCube = null;
    positionCubes();
});


init();
    // script.js end
