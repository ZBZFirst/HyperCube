// saveCubes.js
import { exportFilteredData } from './dataManager.js';

export function handleExport(selectedCubes) {
  if (selectedCubes.length === 0) {
    alert("Please select at least one article to export");
    return;
  }

  try {
    exportFilteredData();
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export data");
  }
}
