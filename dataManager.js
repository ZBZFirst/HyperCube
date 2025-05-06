// dataManager.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchPubMedData, DEFAULT_API_KEY } from './pubmedFetcher.js';
import { showPubMedFetchOverlay, hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteFromData, deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData, handleExport } from './saveCubes.js';

let data = [];

/* ========== CORE DATA FUNCTIONS ========== */

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

export function getData() {
  return data;
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


/* ========== UI TABLE FUNCTIONS ========== */

export function populateDataTable(data, onSelect) {
  const tbody = d3.select('#data-table tbody');
  tbody.selectAll('tr').remove();

  const rows = tbody.selectAll('tr')
    .data(data)
    .enter()
    .append('tr')
    .attr('data-pmid', d => d.PMID)
    .classed('complete', d => d.complete);

  // Title column
  rows.append('td')
    .text(d => d.Title?.substring(0, 50) + (d.Title?.length > 50 ? '...' : ''));

  // Checkbox column
  rows.append('td')
    .append('input')
    .attr('type', 'checkbox')
    .attr('class', 'select-checkbox')
    .on('change', function(event) {
      const pmid = d3.select(this.closest('tr')).attr('data-pmid');
      onSelect(pmid, event.target.checked);
    });

  // Notes column
  rows.append('td')
    .append('input')
    .attr('type', 'text')
    .attr('class', 'notes-input')
    .attr('value', d => d.Notes || '')
    .on('change', function(event, d) {
      addAnnotation(d.PMID, 'Notes', event.target.value);
    });

  // Rating column
  const ratingSelect = rows.append('td')
    .append('select')
    .attr('class', 'rating-select');
    
  ratingSelect.selectAll('option')
    .data([...Array(6).keys()].slice(1))
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d)
    .filter((d, i, nodes) => d === nodes[i].__data__.Rating)
    .attr('selected', true);
    
  ratingSelect.on('change', function(event, d) {
    addAnnotation(d.PMID, 'Rating', event.target.value);
  });

  // Tags column
  rows.append('td')
    .append('input')
    .attr('type', 'text')
    .attr('class', 'tags-input')
    .attr('value', d => d.Tags || '')
    .on('change', function(event, d) {
      addAnnotation(d.PMID, 'Tags', event.target.value);
    });
}

/* ========== TEXT ZONE FUNCTIONS ========== */

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

export function clearTextZone() {
  document.getElementById('selected-title').textContent = 'No article selected';
  document.getElementById('pmid-text').textContent = '-';
  document.getElementById('year-text').textContent = '-';
  document.getElementById('source-text').textContent = '-';
  document.getElementById('doi-link').textContent = '-';
  document.getElementById('pmc-link').textContent = '-';
  document.getElementById('abstract-text').textContent = 'Select an article to view its abstract';
}

/* ========== PUBMED FETCH FUNCTIONS ========== */

export async function attemptPubMedFetch() {
  const overlay = showPubMedFetchOverlay();
  
  return new Promise((resolve) => {
    overlay.querySelector('button').onclick = async () => {
      const fetchButton = overlay.querySelector('button');
      fetchButton.disabled = true;
      fetchButton.textContent = 'Fetching...';
      
      try {
        const searchTerm = overlay.querySelector('#pubmed-search-term').value.trim();
        const apiKey = overlay.querySelector('#pubmed-api-key').value.trim() || DEFAULT_API_KEY;
        const result = await fetchPubMedData(searchTerm, apiKey);
        hidePubMedFetchOverlay();
        resolve(result);
      } catch (error) {
        console.error("PubMed fetch failed:", error);
        fetchButton.textContent = 'Try Again';
        fetchButton.disabled = false;
      }
    };
    
    overlay.querySelectorAll('button')[1].onclick = () => {
      hidePubMedFetchOverlay();
      resolve(null);
    };
  });
}

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
