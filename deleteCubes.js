// deleteCubes.js

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

export function deleteSelectedFromData(pmidsToDelete) {
  if (!Array.isArray(pmidsToDelete)) return;
  data = data.filter(item => !pmidsToDelete.includes(item.PMID));
  return data;
}

export function deleteFromData(pmid) {
  const index = data.findIndex(item => item.PMID === pmid);
  if (index !== -1) data.splice(index, 1);
  return data;
}

export function deleteSelectedCubes(selectedCubes) {
    selectedCubes.forEach(cube => {
        scene.remove(cube);
        const index = cubes.indexOf(cube);
        if (index !== -1) cubes.splice(index, 1);
    });
    return [];
}
