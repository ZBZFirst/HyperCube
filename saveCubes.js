// saveCubes.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { getData } from './dataManager.js';

const UI_ONLY_EXPORT_FIELDS = new Set([
  'complete',
  'combinedMeSH',
  'combinedKeywords'
]);

const FIRST_EXPORT_FIELDS = ['ResearchQuestion', 'PubMedQuery'];
const TRAILING_EXPORT_FIELDS = ['Notes', 'Rating', 'Tags'];

function sanitizeCsvValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r?\n/g, ' ').trim();
}

function getExportColumns(data) {
  const guaranteedFields = [...FIRST_EXPORT_FIELDS, ...TRAILING_EXPORT_FIELDS];
  if (!data.length) return guaranteedFields;

  const firstRowColumns = Object.keys(data[0]).filter(
    key => !UI_ONLY_EXPORT_FIELDS.has(key) && !guaranteedFields.includes(key)
  );

  return [...FIRST_EXPORT_FIELDS, ...firstRowColumns, ...TRAILING_EXPORT_FIELDS];
}

function normalizeExportData(data, columns) {
  return data.map(item => {
    const row = {};
    columns.forEach(column => {
      row[column] = sanitizeCsvValue(item[column] ?? '');
    });
    return row;
  });
}

export function exportFilteredData(dataOverride = null) {
  const data = dataOverride || getData();
  if (!data || !data.length) {
    alert("No data available to export");
    return false;
  }

  const columns = getExportColumns(data);
  const exportData = normalizeExportData(data, columns);

  const blob = new Blob([d3.csvFormat(exportData, columns)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pubmed_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
