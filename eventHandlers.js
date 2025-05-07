import { getData, setData, clearTextZone, updateTextZone, populateDataTable } from './dataManager.js';
import { deleteSelectedCubes, deleteSelectedFromData } from './deleteCubes.js';
import { highlightCubeByPmid } from './cubeManager.js';
import { showErrorToUser } from './uiManager.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

// Store references to current state
let currentSelectedCubes = [];
let currentLastSelectedCube = null;
let currentScene = null;

// State verification utility
function verifyState(context) {
    const state = {
        context,
        selectedCubes: {
            count: currentSelectedCubes?.length || 0,
            valid: Array.isArray(currentSelectedCubes),
            samplePmid: currentSelectedCubes?.[0]?.userData?.PMID
        },
        lastSelectedCube: {
            exists: !!currentLastSelectedCube,
            pmid: currentLastSelectedCube?.userData?.PMID
        },
        scene: {
            exists: !!currentScene,
            childrenCount: currentScene?.children?.length || 0
        },
        data: {
            count: getData()?.length || 0,
            loaded: !!getData()
        },
        domElements: {
            deleteBtn: !!document.getElementById('delete-btn'),
            downloadBtn: !!document.getElementById('download-btn')
        }
    };

    console.groupCollapsed(`State verification (${context})`);
    console.log('Full state:', state);
    
    // Check for critical issues
    if (!state.selectedCubes.valid) {
        console.error('Invalid selectedCubes - expected array');
    }
    if (!state.scene.exists) {
        console.error('Scene reference missing');
    }
    if (!state.data.loaded) {
        console.warn('No data loaded');
    }
    
    console.groupEnd();
    return state;
}

export function setupEventHandlers(selectedCubes, lastSelectedCube, scene) {
    verifyState('setupEventHandlers-start');
    
    // Update our stored references
    currentSelectedCubes = selectedCubes || [];
    currentLastSelectedCube = lastSelectedCube;
    currentScene = scene;

    // Clear existing event listeners to avoid duplicates
    const deleteBtn = document.getElementById('delete-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    if (deleteBtn) {
        deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    }
    if (downloadBtn) {
        downloadBtn.replaceWith(downloadBtn.cloneNode(true));
    }

    // Setup new event listeners
    document.getElementById('delete-btn')?.addEventListener('click', handleDelete);
    document.getElementById('download-btn')?.addEventListener('click', handleDownload);
    
    verifyState('setupEventHandlers-end');
}

async function handleDelete() {
    const state = verifyState('handleDelete-start');
    
    try {
        if (!state.selectedCubes.count) {
            showErrorToUser("Please select at least one article first");
            return;
        }

        // Create a copy of the current selection before clearing
        const cubesToDelete = [...currentSelectedCubes];
        const pmidsToDelete = cubesToDelete.map(c => c.userData?.PMID).filter(Boolean);
        
        if (!pmidsToDelete.length) {
            console.error('No valid PMIDs to delete', currentSelectedCubes);
            showErrorToUser("Invalid selection - no articles to delete");
            return;
        }

        // Update data
        const newData = deleteSelectedFromData(pmidsToDelete);
        setData(newData);
        
        // Update scene - use the copied array to avoid reference issues
        if (currentScene) {
            deleteSelectedCubes(cubesToDelete, currentScene);
        } else {
            console.error('No scene reference for deletion');
        }
        
        // Clear all selections and highlights
        highlightCubeByPmid(null, false); // Clear all highlights
        
        // Clear selection state
        currentSelectedCubes = [];
        currentLastSelectedCube = null;
        
        // Refresh UI
        clearTextZone();
        
        // Recreate the data table with proper selection handling
        populateDataTable(newData, (pmid, isSelected) => {
            const result = highlightCubeByPmid(pmid, isSelected);
            if (result) {
                currentSelectedCubes = result.selectedCubes;
                currentLastSelectedCube = result.lastSelectedCube;
                
                // Update text zone when new selection is made
                if (isSelected && result.lastSelectedCube) {
                    updateTextZone(result.lastSelectedCube.userData);
                } else if (!isSelected && currentSelectedCubes.length === 0) {
                    clearTextZone();
                }
            }
        });
        
        // Re-setup event handlers with clean state
        setupEventHandlers(currentSelectedCubes, currentLastSelectedCube, currentScene);
        
        verifyState('handleDelete-success');
    } catch (error) {
        console.error("Deletion failed:", error);
        verifyState('handleDelete-error');
        showErrorToUser("Failed to delete selected articles");
    }
}

async function handleDownload() {
    const state = verifyState('handleDownload-start');
    
    try {
        if (!state.data.count) {
            showErrorToUser("No data available to export");
            return;
        }

        const exportData = getData().map(item => ({
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
            verifyState('handleDownload-cleanup');
        }, 100);
        
        verifyState('handleDownload-success');
    } catch (error) {
        console.error("Export failed:", error);
        verifyState('handleDownload-error');
        showErrorToUser("Failed to export data");
    }
}
