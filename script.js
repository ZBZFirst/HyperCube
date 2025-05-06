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

let sceneObjects;
let selectedCubes = [];
let lastSelectedCube = null;

async function init() {
    try {
        showLoadingIndicator();
        sceneObjects = createScene();
        if (!sceneObjects) throw new Error("Scene initialization failed");
        
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        
        let data;
        const pubmedData = await attemptPubMedFetch();
        if (pubmedData && pubmedData.length) {
            data = pubmedData;
        } else {
            console.log("Falling back to CSV load");
            data = await loadData("pubmed_data.csv");
            if (!data?.length) throw new Error("No data loaded from either source");
        }
        
        // Store the initial data
        setData(data);
        
        createCubesFromData(data, sceneObjects.scene);
        
        setupUI(data, selectedCubes, lastSelectedCube, (newSelectedCubes, newLastSelectedCube) => {
            selectedCubes = result.selectedCubes;
            lastSelectedCube = result.lastSelectedCube;
            console.log("Current selection:", selectedCubes.map(c => c.userData.pmid));
        });
        
        setupEventHandlers();
        setupSplitters();
        startAnimationLoop();
    } catch (error) {
        console.error("Initialization failed:", error);
        showErrorToUser(error.message);
        createFallbackScene();
    } finally {
        removeLoadingIndicator();
    }
}


function setupEventHandlers() {
    document.getElementById('delete-btn').addEventListener('click', () => {
        if (selectedCubes.length === 0) {
            alert("Please select at least one article first");
            return;
        }
        
        try {
            const pmidsToDelete = selectedCubes.map(c => c.userData.pmid);
            
            // Update data
            const newData = deleteSelectedFromData(pmidsToDelete);
            
            // Update scene
            selectedCubes = deleteSelectedCubes(selectedCubes, sceneObjects.scene);
            lastSelectedCube = null;
    
            // Refresh UI with updated data
            populateDataTable(
                newData,
                (pmid, isSelected) => {
                    const result = highlightCubeByPmid(pmid, isSelected, selectedCubes, lastSelectedCube);
                    if (result) {
                        selectedCubes = result.selectedCubes;
                        lastSelectedCube = result.lastSelectedCube;
                    }
                }
            );
            
            clearTextZone();
        } catch (error) {
            console.error("Delete failed:", error);
            showErrorToUser("Failed to delete selected articles");
        }
    });
    
    document.getElementById('download-btn').addEventListener('click', () => {
        try {
            const currentData = getData();
            if (!currentData || !currentData.length) {
                showErrorToUser("No data available to export");
                return;
            }
            exportFilteredData();
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

init();
// script.js end
