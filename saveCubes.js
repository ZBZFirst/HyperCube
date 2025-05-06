// saveCubes.js
import { getData } from './dataManager.js';

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


export function exportFilteredData() {
  if (!data.length) {
    alert("No data available to export");
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
}
