import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI } from './uiManager.js';
import { loadData, exportFilteredData, populateDataTable, updateTextZone, deleteFromData, getData } from './dataManager.js';
import { 
    createCubesFromData, 
    deleteSelectedCube,
    getCubes,
    highlightCubeByPmid,
    centerCameraOnCube,
    initCubeManager
} from './cubeManager.js';

// Global state
let sceneObjects;
let selectedCube = null;

async function init() {
    try {
        showLoadingIndicator();
        
        // 1. Initialize scene
        sceneObjects = createScene();
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        
        // 2. Load data
        const data = await loadData("pubmed_data.csv");
        if (!data || data.length === 0) {
            throw new Error("No data loaded - check your CSV file");
        }

        // 3. Create cubes
        createCubesFromData(data, sceneObjects.scene);
        
        // 4. Initialize UI
        setupUI(data);
        
        // 5. Setup event handlers
        setupEventHandlers();
        
        // 6. Start animation
        startAnimationLoop();

    } catch (error) {
        console.error("Initialization failed:", error);
        showErrorToUser(error.message);
        createFallbackScene();
    } finally {
        removeLoadingIndicator();
    }
}

// Helper functions
function setupUI(data) {
    populateDataTable(data, (pmid, isSelected) => {
        selectedCube = highlightCubeByPmid(pmid, isSelected);
        if (selectedCube && isSelected) {
            centerCameraOnCube(selectedCube);
            updateTextZone(selectedCube.userData);
        }
    });
}

function setupEventHandlers() {
    // Delete button
    document.getElementById('delete-btn').addEventListener('click', () => {
        if (!selectedCube) {
            alert("Please select an article first");
            return;
        }
        
        const pmid = selectedCube.userData.pmid;
        
        // Remove from data
        deleteFromData(pmid);
        
        // Remove cube from scene
        deleteSelectedCube();
        
        // Refresh table
        populateDataTable(
            getData(),
            (pmid, isSelected) => {
                const cubes = getCubes();
                const cube = cubes.find(c => c.userData.pmid === pmid);
                if (cube) {
                    selectedCube = highlightCubeByPmid(pmid, isSelected);
                    if (isSelected) centerCameraOnCube(cube);
                }
            }
        );
        
        selectedCube = null;
    });

    // Download button
    document.getElementById('download-btn').addEventListener('click', async () => {
        try {
            await exportFilteredData();
        } catch (error) {
            console.error("Export failed:", error);
            showErrorToUser("Failed to export data");
        }
    });
}

function startAnimationLoop() {
    function animate() {
        requestAnimationFrame(animate);
        sceneObjects.updateControls(0.016);
        sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);
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
}

function removeLoadingIndicator() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.remove();
}

function showErrorToUser(message) {
    alert(`Error: ${message}`);
}

function createFallbackScene() {
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

init();
