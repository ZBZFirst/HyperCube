// deleteCubes.js
import { deleteSelectedFromData } from './dataManager.js';
import { deleteSelectedCubes } from './cubeManager.js';

export function handleDelete(selectedCubes, updateSelection, refreshUI) {
  if (selectedCubes.length === 0) {
    alert("Please select at least one article first");
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
    refreshUI();
  } catch (error) {
    console.error("Deletion failed:", error);
    alert("Failed to delete selected articles");
  }
}
