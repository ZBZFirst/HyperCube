// dataManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchPubMedData } from './pubmedFetcher.js';

let data = [];

/* ========== PRIVATE HELPER FUNCTIONS ========== */

function initializeItemFields(item) {
  item.includeArticle = item.includeArticle || "true";
  item.rationale = item.rationale || "";
  item.tags = item.tags || "";
  return item;
}

function updateCompletionStatus(item) {
  item.complete = item.Notes && item.Rating && item.Tags;
  return item;
}

function createTitleCell(row, d) {
  row.append('td')
    .text(d => d.Title?.substring(0, 50) + (d.Title?.length > 50 ? '...' : ''));
}

function createCheckboxCell(row, onSelect) {  // Changed parameter list
  row.append('td')
    .append('input')
    .attr('type', 'checkbox')
    .attr('class', 'select-checkbox')
    .on('change', function(event) {
      const pmid = d3.select(this.closest('tr')).attr('data-pmid');
      onSelect(pmid, event.target.checked);  // Now properly using the passed callback
    });
}

function createNotesCell(row, d) {
  row.append('td')
    .append('input')
    .attr('type', 'text')
    .attr('class', 'notes-input')
    .attr('value', d => d.Notes || '')
    .on('change', function(event, d) {
      addAnnotation(d.PMID, 'Notes', event.target.value);
      d3.select(this.closest('tr')).classed('complete', d.complete);
    });
}

function createRatingCell(row, d) {
  const select = row.append('td')
    .append('select')
    .attr('class', 'rating-select')
    .on('change', function(event, d) {
      addAnnotation(d.PMID, 'Rating', event.target.value);
      d3.select(this.closest('tr')).classed('complete', d.complete);
    });
  
  select.selectAll('option')
    .data([...Array(6).keys()].slice(1))
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d)
    .filter((d, i, nodes) => d === nodes[i].__data__.Rating)
    .attr('selected', true);
}

function createTagsCell(row, d) {
  row.append('td')
    .append('input')
    .attr('type', 'text')
    .attr('class', 'tags-input')
    .attr('value', d => d.Tags || '')
    .on('change', function(event, d) {
      addAnnotation(d.PMID, 'Tags', event.target.value);
      d3.select(this.closest('tr')).classed('complete', d.complete);
    });
}

function setupTableRows(tbody, data, onSelect) {
  return tbody.selectAll('tr')
    .data(data)
    .enter()
    .append('tr')
    .attr('data-pmid', d => d.PMID)
    .classed('complete', d => d.complete)
    .on('keydown', function(event) {
    });
}

export async function attemptPubMedFetch() {
    // Default search term - you might want to make this configurable
    const searchTerm = "Liquid Mechanical Ventilation Life Support Humans";
    try {
        const data = await fetchPubMedData(searchTerm);
        return data;
    } catch (error) {
        console.error("PubMed fetch failed:", error);
        throw error;
    }
}

function createExportBlob(data) {
  const exportData = data.map(item => ({
    ...item,
    Notes: item.Notes || '',
    Rating: item.Rating || '',
    Tags: item.Tags || ''
  }));
  return new Blob([d3.csvFormat(exportData)], { type: 'text/csv;charset=utf-8;' });
}

/* ========== PUBLIC API FUNCTIONS ========== */

export async function loadData(url) {
  try {
    data = await d3.csv(url);
    data.forEach(initializeItemFields);
    return data;
  } catch (error) {
    console.error("Error loading data:", error);
    return [];
  }
}

export function addAnnotation(pmid, field, value) {
  const item = data.find(d => d.PMID === pmid);
  if (item) {
    item[field] = value;
    updateCompletionStatus(item);
    return true;
  }
  return false;
}

export function updateTextZone(article) {
  document.getElementById('selected-title').textContent = article.Title;
  document.getElementById('pmid-text').textContent = article.PMID;
  document.getElementById('year-text').textContent = article.PubYear;
  document.getElementById('source-text').textContent = article.Source;
  
  const doiLink = document.getElementById('doi-link');
  doiLink.textContent = article.DOI || '-';
  doiLink.href = article.DOI ? `https://doi.org/${article.DOI}` : '#';
  
  const pmcLink = document.getElementById('pmc-link');
  pmcLink.textContent = article.PMC ? `PMC${article.PMC}` : '-';
  pmcLink.href = article.PMC ? `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${article.PMC}` : '#';
  
  document.getElementById('abstract-text').textContent = article.Abstract || 'No abstract available';
}

export function populateDataTable(data, onSelect) {
  const tbody = d3.select('#data-table tbody');
  tbody.selectAll('tr').remove();

  const rows = setupTableRows(tbody, data, onSelect);
  
  createTitleCell(rows);
  createCheckboxCell(rows, onSelect);
  createNotesCell(rows);
  createRatingCell(rows);
  createTagsCell(rows);
}

export function getData() {
  return data;
}

export function deleteSelectedFromData(pmids) {
  data = data.filter(item => !pmids.includes(item.PMID));
  return data;
}

export function deleteFromData(pmid) {
  const index = data.findIndex(item => item.PMID === pmid);
  if (index !== -1) {
    data.splice(index, 1);
  }
  return data;
}

export function exportFilteredData() {
  if (!data.length) {
    alert("No data available to export");
    return;
  }
  
  const blob = createExportBlob(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `pubmed_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// dataManager.js end
