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
        
        setupUI(data, 
            () => [...selectedCubes], // Getter function
            () => lastSelectedCube,   // Getter function
            (newSelectedCubes, newLastSelectedCube) => {
                selectedCubes = newSelectedCubes;
                lastSelectedCube = newLastSelectedCube;
                console.log("Updated selection:", selectedCubes.map(c => c.userData.pmid));
            }
        );
        
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
    // DELETE Button Handler (merged)
    document.getElementById('delete-btn').addEventListener('click', () => {
        console.group('[Delete Operation]');

        if (selectedCubes.length === 0) {
            alert("Please select at least one article first");
            console.log('No cubes selected for deletion');
            console.groupEnd();
            return;
        }

        try {
            const pmidsToDelete = selectedCubes.map(c => c.userData.pmid);
            console.log('Deleting PMIDs:', pmidsToDelete);

            // Update data store
            console.log('Updating data store...');
            const newData = deleteSelectedFromData(pmidsToDelete);
            setData(newData);

            // Update scene
            console.log('Updating scene...');
            selectedCubes = deleteSelectedCubes(selectedCubes, sceneObjects.scene);

            // Update lastSelectedCube if it was deleted
            if (lastSelectedCube && pmidsToDelete.includes(lastSelectedCube.userData.pmid)) {
                console.log('Last selected cube was deleted - updating reference');
                lastSelectedCube = selectedCubes.length > 0 ? selectedCubes[0] : null;
                console.log('New lastSelectedCube:', lastSelectedCube?.userData.pmid);
            }

            // Force UI updates
            console.log('Updating UI state...');
            if (lastSelectedCube) {
                console.log('Updating text zone with remaining selection');
                updateTextZone(lastSelectedCube.userData);
            } else {
                console.log('No selections remain - clearing text zone');
                clearTextZone();
            }

            // Refresh data table
            console.log('Refreshing data table...');
            populateDataTable(newData, (pmid, isSelected) => {
                const result = highlightCubeByPmid(pmid, isSelected, selectedCubes, lastSelectedCube);
                if (result) {
                    selectedCubes = result.selectedCubes;
                    lastSelectedCube = result.lastSelectedCube;

                    if (isSelected && result.cube) {
                        updateTextZone(result.cube.userData);
                    }
                }
            });

            console.log('Delete operation complete');
        } catch (error) {
            console.error("Delete failed:", error);
            showErrorToUser("Failed to delete selected articles");
        }

        console.groupEnd();
    });

    // DOWNLOAD/EXPORT Button Handler (restored)
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
