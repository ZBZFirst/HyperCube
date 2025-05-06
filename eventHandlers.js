// eventHandlers.js
import { deleteSelectedFromData, getData, exportFilteredData } from './dataManager.js';
import { deleteSelectedCubes, highlightCubeByPmid, centerCameraOnCube } from './cubeManager.js';
import { populateDataTable, updateTextZone, clearTextZone } from './uiManager.js';
import { showErrorToUser } from './uiManager.js';

export function setupEventHandlers(selectedCubes, lastSelectedCube, updateSelection) {
    document.getElementById('delete-btn').addEventListener('click', () => 
        handleDelete(selectedCubes, lastSelectedCube, updateSelection));
    
    document.getElementById('download-btn').addEventListener('click', handleDownload);
}

export async function handleDelete(selectedCubes, lastSelectedCube, updateSelection) {
    if (selectedCubes.length === 0) {
        showErrorToUser("Please select at least one article first");
        return;
    }

    try {
        const pmidsToDelete = selectedCubes.map(c => c.userData.pmid);
        
        // Update data
        deleteSelectedFromData(pmidsToDelete);
        
        // Update scene
        deleteSelectedCubes(selectedCubes);
        
        // Update selection state
        updateSelection([], null);
        
        // Refresh UI
        refreshUIAfterDelete();
    } catch (error) {
        console.error("Deletion failed:", error);
        showErrorToUser("Failed to delete selected articles");
    }
}

function refreshUIAfterDelete() {
    populateDataTable(
        getData(),
        (pmid, isSelected) => {
            const result = highlightCubeByPmid(pmid, isSelected, [], null);
            if (result?.cube && isSelected) {
                centerCameraOnCube(result.cube);
            }
        }
    );
    clearTextZone();
}

export async function handleDownload() {
    try {
        await exportFilteredData();
    } catch (error) {
        console.error("Export failed:", error);
        showErrorToUser("Failed to export data");
    }
}
