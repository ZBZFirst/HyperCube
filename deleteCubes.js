// deleteCubes.js
import { getData, setData } from './dataManager.js';

// For data operations
export function deleteSelectedFromData(pmidsToDelete) {
  const currentData = getData();
  if (!Array.isArray(pmidsToDelete)) return currentData;
  
  const newData = currentData.filter(item => !pmidsToDelete.includes(item.PMID));
  setData(newData);
  return newData;
}

// For scene operations
export function deleteSelectedCubes(selectedCubes, scene) {
  if (!selectedCubes || !selectedCubes.length) return [];
  
  selectedCubes.forEach(cube => {
    scene.remove(cube);
  });
  
  return [];
}
