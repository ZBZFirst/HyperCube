// deleteCubes.js
import { getData, setData } from './dataManager.js';

export function deleteSelectedFromData(pmidsToDelete) {
  const currentData = getData();
  if (!Array.isArray(pmidsToDelete)) return currentData;
  
  const newData = currentData.filter(item => !pmidsToDelete.includes(item.PMID));
  setData(newData);
  return newData;
}

export function deleteFromData(pmid) {
  const currentData = getData();
  const index = currentData.findIndex(item => item.PMID === pmid);
  if (index !== -1) {
    const newData = [...currentData];
    newData.splice(index, 1);
    setData(newData);
    return newData;
  }
  return currentData;
}
