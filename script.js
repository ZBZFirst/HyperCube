// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI } from './uiManager.js';
import { loadData, exportFilteredData, populateDataTable, updateTextZone, attemptPubMedFetch, hidePubMedFetchOverlay, deleteFromData, getData, deleteSelectedFromData, addAnnotation } from './dataManager.js';
import { 
    createCubesFromData, 
    deleteSelectedCubes,
    getCubes,
    highlightCubeByPmid,
    centerCameraOnCube,
    initCubeManager
} from './cubeManager.js';

// Global state
let sceneObjects;
let selectedCubes = [];
let lastSelectedCube = null;

async function init() {
    try {
        showLoadingIndicator();
        
        // 1. Initialize scene first
        sceneObjects = createScene();
        if (!sceneObjects) throw new Error("Scene initialization failed");
        
        // 2. Initialize cube manager with proper references
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        
        // 3. DATA LOADING - try PubMed fetch first, then fall back to CSV
        let data;
        const pubmedData = await attemptPubMedFetch();
        
        if (pubmedData && pubmedData.length) {
            data = pubmedData;
        } else {
            console.log("Falling back to CSV load");
            data = await loadData("pubmed_data.csv");
            if (!data?.length) throw new Error("No data loaded from either source");
        }
        
        // 4. Create cubes
        createCubesFromData(data, sceneObjects.scene);
        
        // 5. Setup UI and controls
        setupUI(data);
        setupEventHandlers();
        setupSplitters();
        
        // 6. Start animation last
        startAnimationLoop();
        
    } catch (error) {
        console.error("Initialization failed:", error);
        showErrorToUser(error.message);
        createFallbackScene();
    } finally {
        removeLoadingIndicator();
    }
}

function setupUI(data) {
    populateDataTable(data, (pmid, isSelected) => {
        const result = highlightCubeByPmid(pmid, isSelected, selectedCubes, lastSelectedCube);
        if (result) {
            selectedCubes = result.selectedCubes;
            lastSelectedCube = result.lastSelectedCube;
            
            // Update button states based on selection
            updateButtonStates();
            
            // Update text display
            if (isSelected && result.cube) {
                updateTextZone(result.cube.userData);
                centerCameraOnCube(result.cube);
            } else if (selectedCubes.length === 0) {
                clearTextZone();
            } else if (lastSelectedCube) {
                updateTextZone(lastSelectedCube.userData);
            }
        }
    });
}

function updateButtonStates() {
    const deleteBtn = document.getElementById('delete-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    const hasSelection = selectedCubes.length > 0;
    deleteBtn.disabled = !hasSelection;
    downloadBtn.disabled = !hasSelection;
}

function setupEventHandlers() {
    // Delete button - handles multiple selections
    document.getElementById('delete-btn').addEventListener('click', () => {
        if (selectedCubes.length === 0) {
            alert("Please select at least one article first");
            return;
        }
        
        // Get PMIDs to delete
        const pmidsToDelete = selectedCubes.map(c => c.userData.pmid);
        
        // Update data
        deleteSelectedFromData(pmidsToDelete);
        
        // Update scene
        selectedCubes = deleteSelectedCubes(selectedCubes);
        lastSelectedCube = null;
        
        // Refresh UI
        populateDataTable(
            getData(),
            (pmid, isSelected) => {
                const result = highlightCubeByPmid(pmid, isSelected, selectedCubes, lastSelectedCube);
                if (result) {
                    selectedCubes = result.selectedCubes;
                    lastSelectedCube = result.lastSelectedCube;
                    if (result.cube && isSelected) {
                        centerCameraOnCube(result.cube);
                    }
                }
            }
        );
        
        // Update text zone with last selected cube's info if available
        if (lastSelectedCube) {
            updateTextZone(lastSelectedCube.userData);
        }
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
        
        // Add null check
        if (sceneObjects && sceneObjects.updateControls) {
            sceneObjects.updateControls(0.016);
            sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);
        }
    }
    animate();
}

function setupSplitters() {
  const verticalSplitter = document.getElementById('vertical-splitter');
  const horizontalSplitter = document.getElementById('horizontal-splitter');
  const mainContent = document.getElementById('main-content');

  // Initialize with default values if not set
  if (!mainContent.style.gridTemplateColumns) {
    mainContent.style.gridTemplateColumns = 'minmax(150px, 300px) 8px 1fr';
  }
  if (!mainContent.style.gridTemplateRows) {
    mainContent.style.gridTemplateRows = '1fr 8px minmax(100px, 200px)';
  }

  verticalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    // Get computed style if inline style isn't set
    const gridTemplateColumns = mainContent.style.gridTemplateColumns || 
                              window.getComputedStyle(mainContent).gridTemplateColumns;
    const startWidth = parseInt(gridTemplateColumns.split(' ')[0]);

    function doDrag(e) {
      const newWidth = startWidth + (e.clientX - startX);
      mainContent.style.gridTemplateColumns = `${Math.max(150, newWidth)}px 8px 1fr`;
    }

    function stopDrag() {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  });

  horizontalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startY = e.clientY;
    // Get computed style if inline style isn't set
    const gridTemplateRows = mainContent.style.gridTemplateRows || 
                           window.getComputedStyle(mainContent).gridTemplateRows;
    const startHeight = parseInt(gridTemplateRows.split(' ')[2]);

    function doDrag(e) {
      const newHeight = startHeight - (e.clientY - startY);
      mainContent.style.gridTemplateRows = `1fr 8px ${Math.max(100, newHeight)}px`;
    }

    function stopDrag() {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  });
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

function clearTextZone() {
    document.getElementById('selected-title').textContent = 'No article selected';
    document.getElementById('pmid-text').textContent = '-';
    document.getElementById('year-text').textContent = '-';
    document.getElementById('source-text').textContent = '-';
    document.getElementById('doi-link').textContent = '-';
    document.getElementById('pmc-link').textContent = '-';
    document.getElementById('abstract-text').textContent = 'Select an article to view its abstract';
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
// script.js end
