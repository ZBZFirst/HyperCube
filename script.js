// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI, setupUI, setupSplitters, showLoadingIndicator, removeLoadingIndicator, showErrorToUser, clearTextZone, createFallbackScene } from './uiManager.js';
import { loadData, exportFilteredData, populateDataTable, updateTextZone, attemptPubMedFetch, getData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteFromData, deleteSelectedFromData, deleteSelectedCubes } from './deleteCubes.js';
import { exportFilteredData, handleExport } from './saveCubes.js';

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
        setupUI(data, selectedCubes, lastSelectedCube, (newSelectedCubes, newLastSelectedCube) => {
            selectedCubes = newSelectedCubes;
            lastSelectedCube = newLastSelectedCube;
        });
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


init();
// script.js end
