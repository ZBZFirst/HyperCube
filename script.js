// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI, setupUI, showLoadingIndicator, removeLoadingIndicator, showErrorToUser, clearTextZone, createFallbackScene } from './uiManager.js';
import { loadData, populateDataTable, updateTextZone, attemptPubMedFetch, getData, setData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager, deleteSelectedCubes } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';
import { setupControls } from './controlsSetup.js';
import { setupEventHandlers } from './eventHandlers.js';
import { setGeometryScaleMode, GeometryScaleModes } from './createCube.js';

let sceneObjects = null;
let selectedCubes = [];
let lastSelectedCube = null;
let currentData = [];

function refreshCubesFromCurrentData() {
    if (!sceneObjects?.scene || !currentData?.length) return;
    createCubesFromData(currentData, sceneObjects.scene);
}

function setSortButtonState(activeMode) {
    document.querySelectorAll('[data-sort-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.sortMode === activeMode);
    });
}

function setScaleButtonState(activeMode) {
    document.querySelectorAll('[data-scale-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.scaleMode === activeMode);
    });
}

function setupControlGroups() {
    document.addEventListener('click', (event) => {
        const clickedInsideGroup = event.target.closest('.control-group');
        if (!clickedInsideGroup) {
            document.querySelectorAll('.control-options').forEach(group => group.classList.remove('open'));
        }
    });

    window.toggleControlGroup = (groupId) => {
        document.querySelectorAll('.control-options').forEach(group => {
            if (group.id !== groupId) {
                group.classList.remove('open');
            }
        });
        const target = document.getElementById(groupId);
        if (target) target.classList.toggle('open');
    };

    window.applySortMode = (mode) => {
        if (!window.PositionModes || !window.setPositionMode) return;
        const normalized = String(mode || '').toUpperCase();
        const positionMode = window.PositionModes[normalized];
        if (!positionMode) return;

        window.setPositionMode(positionMode);
        setSortButtonState(positionMode);
    };

    window.applyGeometryScaleMode = (mode) => {
        setGeometryScaleMode(mode);
        refreshCubesFromCurrentData();
        setScaleButtonState(mode);
    };
}

async function init() {
    try {
        console.groupCollapsed("Initialization started");
        showLoadingIndicator();

        // 1. Get container
        const container = document.getElementById('graphics-container');
        console.log("1. Container:", container);
        if (!container) throw new Error("Graphics container not found");

        // 2. Create scene objects
        console.log("2. Creating scene objects...");
        sceneObjects = createScene(container);
        console.log("Scene objects created:", {
            scene: sceneObjects?.scene,
            camera: sceneObjects?.camera,
            renderer: sceneObjects?.renderer,
            canvas: sceneObjects?.renderer?.domElement,
            canvasDimensions: sceneObjects?.renderer?.domElement 
                ? `${sceneObjects.renderer.domElement.width}x${sceneObjects.renderer.domElement.height}`
                : 'N/A',
            canvasInDOM: container.contains(sceneObjects?.renderer?.domElement)
        });

        if (!sceneObjects) throw new Error("Scene initialization failed");

        // 3. Add debug objects
        console.log("3. Adding debug objects...");
        const axesHelper = new THREE.AxesHelper(5);
        sceneObjects.scene.add(axesHelper);
        const gridHelper = new THREE.GridHelper(10, 10);
        sceneObjects.scene.add(gridHelper);
        const testCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        sceneObjects.scene.add(testCube);
        console.log("Debug objects added:", sceneObjects.scene.children);

        // 4. Initialize cube manager
        console.log("4. Initializing cube manager...");
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        
        // 5. Load data
        console.log("5. Loading data...");
        let data;
        const pubmedData = await attemptPubMedFetch();
        data = pubmedData || await loadData("pubmed_data.csv");
        console.log("Data loaded, first item:", data?.[0]);
        if (!data?.length) throw new Error("No data loaded");
        setData(data);
        currentData = data;
        
        // 6. Create cubes
        console.log("6. Creating cubes...");
        const cubes = createCubesFromData(data, sceneObjects.scene);
        console.log(`Created ${cubes.length} cubes`, cubes);
        
        // 7. Setup selection callback
        console.log("7. Setting up selection callback...");
        const onSelectCallback = (newSelectedCubes, newLastSelectedCube) => {
            console.log("Selection changed:", {
                newSelectedCount: newSelectedCubes.length,
                newLastSelected: newLastSelectedCube?.userData?.PMID
            });
            selectedCubes = newSelectedCubes;
            lastSelectedCube = newLastSelectedCube;
            if (newLastSelectedCube) {
                updateTextZone(newLastSelectedCube.userData);
            }
            // Update event handlers with new selection state
            setupEventHandlers(selectedCubes, lastSelectedCube, sceneObjects.scene);
        };
        
        // 8. Setup UI
        console.log("8. Setting up UI...");
        setupUI(data, () => [...selectedCubes], () => lastSelectedCube, onSelectCallback);
        setupControlGroups();
        setSortButtonState(window.PositionModes?.GRID || 'grid');
        setScaleButtonState(GeometryScaleModes.NONE);
        
        // 9. Setup controls
        console.log("9. Setting up controls...");
        const controlsResult = setupControls(
            sceneObjects.camera,
            sceneObjects.renderer,
            sceneObjects.scene,
            onSelectCallback
        );
        console.log("Controls result structure:", {
            controls: !!controlsResult.controls,
            updateControls: !!controlsResult.updateControls,
            dispose: !!controlsResult.dispose
        });
        sceneObjects.controls = controlsResult.controls;
        sceneObjects.updateControls = controlsResult.updateControls;
        
        // 10. Start everything
        console.log("10. Starting animation loop...");

        try {
            setupEventHandlers(selectedCubes, lastSelectedCube, sceneObjects.scene);
            console.log("UI setup complete");
        } catch (uiError) {
            console.error("UI setup failed:", uiError);
            throw new Error(`UI initialization failed: ${uiError.message}`);
        }
        
        startAnimationLoop();
        
        console.log("Initialization completed successfully");
        console.groupEnd();
        
    } catch (error) {
        console.error("Initialization failed:", error);
        console.log("Current state:", {
            sceneObjects,
            selectedCubes,
            lastSelectedCube,
            THREE: !!THREE,
            container: document.getElementById('graphics-container')
        });
        showErrorToUser(`Initialization failed: ${error.message}`);
        try {
            createFallbackScene();
        } catch (fallbackError) {
            console.error("Fallback scene failed:", fallbackError);
        }
    } finally {
        removeLoadingIndicator();
    }
}
function startAnimationLoop() {
    if (!sceneObjects) {
        console.error("Cannot start animation - sceneObjects is null");
        return;
    }
    
    let lastTime = performance.now();
    let frameCount = 0;
    
    function animate(currentTime) {
        frameCount++;
        requestAnimationFrame(animate);
        
        // Calculate actual delta time in seconds
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Debug logging
        if (frameCount % 100 === 0) { // Log every 100 frames
            console.groupCollapsed(`Frame ${frameCount} Update`);
            console.log("Delta time:", deltaTime);
            console.log("Controls available:", !!sceneObjects.controls);
            console.log("Update function available:", !!sceneObjects.updateControls);
            
            if (sceneObjects.controls && sceneObjects.updateControls) {
                console.log("Calling updateControls with delta:", deltaTime);
                sceneObjects.updateControls(deltaTime);
                console.log("Camera position after update:", sceneObjects.camera.position);
            }
            
            console.groupEnd();
        } else {
            // Normal operation without logging
            if (sceneObjects.controls && sceneObjects.updateControls) {
                sceneObjects.updateControls(deltaTime);
            }
        }
        
        sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);
    }
    
    console.log("Starting animation loop");
    animate(performance.now());
}













// Rest of your code (setupEventHandlers etc.) remains unchanged
init();
// script.js end
