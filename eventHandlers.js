import { getData, setData, clearTextZone, updateTextZone, populateDataTable } from './dataManager.js';
import { deleteSelectedCubes, deleteSelectedFromData } from './deleteCubes.js';
import { highlightCubeByPmid } from './cubeManager.js';
import { showErrorToUser } from './uiManager.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// Store references to current state
let currentSelectedCubes = [];
let currentLastSelectedCube = null;
let currentScene = null;

export function setupEventHandlers(selectedCubes, lastSelectedCube, scene) {
    // Update our stored references
    currentSelectedCubes = selectedCubes;
    currentLastSelectedCube = lastSelectedCube;
    currentScene = scene;

    // Clear existing event listeners to avoid duplicates
    document.getElementById('delete-btn').replaceWith(document.getElementById('delete-btn').cloneNode(true));
    document.getElementById('download-btn').replaceWith(document.getElementById('download-btn').cloneNode(true));

    // Setup new event listeners
    document.getElementById('delete-btn').addEventListener('click', handleDelete);
    document.getElementById('download-btn').addEventListener('click', handleDownload);
}

async function handleDelete() {
    try {
        if (!currentSelectedCubes || currentSelectedCubes.length === 0) {
            showErrorToUser("Please select at least one article first");
            return;
        }

        const pmidsToDelete = currentSelectedCubes.map(c => c.userData.pmid);
        
        // Update data
        const newData = deleteSelectedFromData(pmidsToDelete);
        setData(newData);
        
        // Update scene
        deleteSelectedCubes(currentSelectedCubes, currentScene);
        
        // Clear selection
        currentSelectedCubes = [];
        currentLastSelectedCube = null;
        
        // Refresh UI
        clearTextZone();
        populateDataTable(newData, (pmid, isSelected) => {
            const result = highlightCubeByPmid(pmid, isSelected, currentSelectedCubes, currentLastSelectedCube);
            if (result) {
                currentSelectedCubes = result.selectedCubes;
                currentLastSelectedCube = result.lastSelectedCube;
            }
        });
    } catch (error) {
        console.error("Deletion failed:", error);
        showErrorToUser("Failed to delete selected articles");
    }
}

async function handleDownload() {
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
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error("Export failed:", error);
        showErrorToUser("Failed to export data");
    }
}
