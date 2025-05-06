// saveCubes.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { getData } from './dataManager.js';

export function exportFilteredData() {
  const data = getData();
  if (!data || !data.length) {
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
