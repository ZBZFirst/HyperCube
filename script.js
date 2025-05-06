// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI, setupUI, setupSplitters, showLoadingIndicator, removeLoadingIndicator, showErrorToUser, clearTextZone, createFallbackScene } from './uiManager.js';
import { loadData, populateDataTable, updateTextZone, attemptPubMedFetch, getData, setData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager, deleteSelectedCubes } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';
import { setupControls } from './controlsSetup.js';

let sceneObjects = null;
let selectedCubes = [];
let lastSelectedCube = null;

async function init() {
    try {
        showLoadingIndicator();
        
        // 1. Get container first
        const container = document.getElementById('graphics-container');
        if (!container) throw new Error("Graphics container not found");
        
        // 2. Initialize scene (using the TOP-LEVEL variable)
        sceneObjects = createScene(container); // No 'const' or 'let' here!
        if (!sceneObjects) throw new Error("Scene initialization failed");
        
        // 3. Initialize cube manager
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        
        // 4. Load data
        let data;
        const pubmedData = await attemptPubMedFetch();
        data = pubmedData || await loadData("pubmed_data.csv");
        if (!data?.length) throw new Error("No data loaded");
        setData(data);
        
        // 5. Create cubes
        createCubesFromData(data, sceneObjects.scene);
        
        // 6. Setup selection callback
        const onSelectCallback = (newSelectedCubes, newLastSelectedCube) => {
            selectedCubes = newSelectedCubes;
            lastSelectedCube = newLastSelectedCube;
            if (newLastSelectedCube) updateTextZone(newLastSelectedCube.userData);
        };
        
        // 7. Setup UI
        setupUI(data, () => [...selectedCubes], () => lastSelectedCube, onSelectCallback);
        
        // 8. Setup controls
        const { controls, updateControls } = setupControls(
            sceneObjects.camera,
            sceneObjects.renderer,
            sceneObjects.scene,
            onSelectCallback
        );
        sceneObjects.controls = controls;
        sceneObjects.updateControls = updateControls;
        
        // 9. Start everything
        setupEventHandlers();
        setupSplitters();
        startAnimationLoop(); // Now uses the top-level sceneObjects
        
    } catch (error) {
        console.error("Initialization failed:", error);
        showErrorToUser(error.message);
        try {
            createFallbackScene();
        } catch (fallbackError) {
            console.error("Fallback scene failed:", fallbackError);
        }
    } finally {
        removeLoadingIndicator();
    }
}

// Modified to use top-level sceneObjects
function startAnimationLoop() {
    if (!sceneObjects) return; // Safety check
    
    function animate() {
        requestAnimationFrame(animate);
        
        if (sceneObjects.controls && sceneObjects.updateControls) {
            sceneObjects.updateControls(0.016);
        }
        
        sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);
    }
    
    animate();
}

// Rest of your code (setupEventHandlers etc.) remains unchanged
init();
// script.js end
