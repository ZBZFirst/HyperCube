// eventHandlers.js
import { getData, setData } from './dataManager.js';
import { deleteSelectedCubes } from './deleteCubes.js';
import { highlightCubeByPmid, centerCameraOnCube } from './cubeManager.js';
import { populateDataTable, updateTextZone, clearTextZone, showErrorToUser } from './uiManager.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export function setupEventHandlers(selectedCubes, lastSelectedCube, updateSelection, refreshUI, scene) {
    document.getElementById('delete-btn').addEventListener('click', () => 
        handleDelete(selectedCubes, updateSelection, refreshUI, scene));
    
    document.getElementById('download-btn').addEventListener('click', handleDownload);
}

export async function handleDelete(selectedCubes, updateSelection, refreshUI, scene) {
    if (selectedCubes.length === 0) {
        showErrorToUser("Please select at least one article first");
        return;
    }

    try {
        const pmidsToDelete = selectedCubes.map(c => c.userData.pmid);
        
        // Update data
        deleteSelectedFromData(pmidsToDelete);
        
        // Update scene
        selectedCubes = deleteSelectedCubes(selectedCubes, scene);
        
        // Update selection state
        updateSelection([], null);
        
        // Refresh UI
        refreshUI();
    } catch (error) {
        console.error("Deletion failed:", error);
        showErrorToUser("Failed to delete selected articles");
    }
}

export async function handleDownload() {
    try {
        const data = getData();
        if (!data || !data.length) {
            showErrorToUser("No data available to export");
            return;
        }

        const exportData = data.map(item => ({
            ...item,
            Notes: item.Notes || '',
            Rating: item.Rating || '',
            Tags: item.Tags || ''
        }));

        const blob = new Blob([d3.csvFormat(exportData)], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pubmed_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Export failed:", error);
        showErrorToUser("Failed to export data");
    }
}
