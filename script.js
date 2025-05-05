// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI, setupUI } from './uiManager.js';
import { loadData, exportFilteredData, populateDataTable, updateTextZone, attemptPubMedFetch, hidePubMedFetchOverlay, deleteFromData, getData, deleteSelectedFromData, addAnnotation } from './dataManager.js';
import { createCubesFromData, deleteSelectedCubes, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager } from './cubeManager.js';

let sceneObjects;
let selectedCubes = [];
let lastSelectedCube = null;

async function init() {
    try {showLoadingIndicator();
        sceneObjects = createScene();
        if (!sceneObjects) throw new Error("Scene initialization failed");
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        let data;
        const pubmedData = await attemptPubMedFetch();
        if (pubmedData && pubmedData.length) {data = pubmedData;} 
            else {console.log("Falling back to CSV load");data = await loadData("pubmed_data.csv");if (!data?.length) throw new Error("No data loaded from either source");}
        createCubesFromData(data, sceneObjects.scene);
        setupUI(data);
        setupEventHandlers();
        setupSplitters();
        startAnimationLoop();} 
            catch (error) {console.error("Initialization failed:", error);
                showErrorToUser(error.message);
                createFallbackScene();} 
    finally {removeLoadingIndicator();}
}


function setupEventHandlers() {
    document.getElementById('delete-btn').addEventListener('click', () => {
        if (selectedCubes.length === 0) {
            alert("Please select at least one article first");
            return;
        }
        const pmidsToDelete = selectedCubes.map(c => c.userData.pmid);
        deleteSelectedFromData(pmidsToDelete);
        selectedCubes = deleteSelectedCubes(selectedCubes);
        lastSelectedCube = null;
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
        if (lastSelectedCube) {
            updateTextZone(lastSelectedCube.userData);
        }
    });
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
    
  if (!mainContent.style.gridTemplateColumns) {
    mainContent.style.gridTemplateColumns = 'minmax(150px, 300px) 8px 1fr';
  }
  if (!mainContent.style.gridTemplateRows) {
    mainContent.style.gridTemplateRows = '1fr 8px minmax(100px, 200px)';
  }

  verticalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
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
