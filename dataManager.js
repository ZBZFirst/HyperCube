// dataManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchPubMedData, DEFAULT_API_KEY  } from './pubmedFetcher.js';

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
    return new Promise((resolve) => {
        const overlay = showPubMedFetchOverlay();
        
        // We'll handle the resolution in the button click handlers
        overlay.querySelector('button').onclick = async () => {
            const fetchButton = overlay.querySelector('button');
            fetchButton.disabled = true;
            fetchButton.textContent = 'Fetching...';
            
            try {
                const searchTerm = overlay.querySelector('#pubmed-search-term').value.trim();
                const apiKey = overlay.querySelector('#pubmed-api-key').value.trim() || DEFAULT_API_KEY;
                
                const data = await fetchPubMedData(searchTerm, apiKey);
                hidePubMedFetchOverlay();
                resolve(data);
            } catch (error) {
                console.error("PubMed fetch failed:", error);
                fetchButton.textContent = 'Try Again';
                fetchButton.disabled = false;
                // Don't resolve here - let user try again or cancel
            }
        };
        
        // Handle cancel button
        overlay.querySelectorAll('button')[1].onclick = () => {
            hidePubMedFetchOverlay();
            resolve(null); // Signal to load from CSV
        };
    });
}

function createExportBlob(data) {
  const exportData = data.map(item => {
    // Create a clean copy of the item without Three.js references
    const cleanItem = {};
    
    // Copy all properties that are safe for CSV
    Object.keys(item).forEach(key => {
      // Only include primitive values and strings
      if (item[key] === null || 
          typeof item[key] !== 'object' || 
          item[key] instanceof Date) {
        cleanItem[key] = item[key];
      }
      // Handle special cases
      else if (key === 'userData' && item[key]) {
        // Flatten userData if it exists
        Object.keys(item[key]).forEach(dataKey => {
          cleanItem[dataKey] = item[key][dataKey];
        });
      }
    });
    
    // Ensure required fields exist
    cleanItem.Notes = item.Notes || '';
    cleanItem.Rating = item.Rating || '';
    cleanItem.Tags = item.Tags || '';
    
    return cleanItem;
  });

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

/* ========== OVERLAY COMPONENT FUNCTIONS ========== */

function createOverlayContainer() {
  const overlay = document.createElement('div');
  overlay.id = 'pubmed-fetch-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: '10000',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: 'white',
    padding: '20px',
    boxSizing: 'border-box'
  });
  return overlay;
}

function createFormContainer() {
  const form = document.createElement('div');
  Object.assign(form.style, {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#222',
    padding: '30px',
    borderRadius: '10px',
    boxShadow: '0 0 20px rgba(0,0,0,0.5)'
  });
  return form;
}

function createSearchTermInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'pubmed-search-term';
  input.value = 'Liquid Mechanical Ventilation Life Support Humans';
  Object.assign(input.style, {
    width: '100%',
    padding: '10px',
    marginBottom: '20px',
    borderRadius: '5px',
    border: 'none'
  });
  
  // Ensure spacebar works
  input.addEventListener('keydown', (e) => e.key === ' ' && e.stopPropagation());
  return input;
}

function createApiKeyInput() {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'pubmed-api-key';
  
  // Now shows the actual default key in placeholder
  input.placeholder = `Leave blank to use default key`;
  
  // Visual indication it's using a default value
  input.title = `Default key: ${DEFAULT_API_KEY}\n\nRate limits may apply with shared keys`;
  
  Object.assign(input.style, {
    width: '100%',
    padding: '10px',
    marginBottom: '30px',
    borderRadius: '5px',
    border: 'none',
    fontFamily: 'monospace' // Better for API key display
  });

  return input;
}

function createActionButton(text, color, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  Object.assign(button.style, {
    padding: '10px 20px',
    backgroundColor: color,
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    flex: '1'
  });
  button.addEventListener('click', onClick);
  return button;
}

function createSpinner() {
  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    border: '5px solid rgba(255,255,255,0.3)',
    borderTop: '5px solid #fff',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    animation: 'spin 1s linear infinite',
    margin: '20px auto'
  });
  return spinner;
}

function addSpinAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  return style;
}

/* ========== MAIN OVERLAY FUNCTION ========== */

export function showPubMedFetchOverlay() {
  // Create overlay structure
  const overlay = createOverlayContainer();
  const form = createFormContainer();
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Fetch PubMed Data';
  title.style.cssText = 'margin-top: 0; text-align: center;';
  form.appendChild(title);
  
  // Add search term input
  form.appendChild(createLabel('Search Term:'));
  const searchInput = createSearchTermInput();
  form.appendChild(searchInput);
  
  // Add API key input
  form.appendChild(createLabel('PubMed API Key (optional):'));
  form.appendChild(createApiKeyInput());
  
  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'display: flex; justify-content: space-between; gap: 10px;';
  
  // Add buttons
  buttonsContainer.appendChild(
    createActionButton('Fetch from PubMed', '#4CAF50', handleFetchClick)
  );
  buttonsContainer.appendChild(
    createActionButton('Load from CSV', '#f44336', () => hidePubMedFetchOverlay())
  );
  
  form.appendChild(buttonsContainer);
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  
  // Add spin animation
  addSpinAnimation();
  
  // Focus on input
  searchInput.focus();
  
  return overlay;
  
  function handleFetchClick() {
    const fetchButton = this;
    fetchButton.disabled = true;
    fetchButton.textContent = 'Fetching...';
    
    const spinner = createSpinner();
    fetchButton.parentNode.insertBefore(spinner, fetchButton.nextSibling);
    
    const searchTerm = searchInput.value.trim();
    const apiKey = document.getElementById('pubmed-api-key').value.trim() || DEFAULT_API_KEY;
    
    return fetchPubMedData(searchTerm, apiKey)
      .finally(() => {
        spinner.remove();
        fetchButton.textContent = 'Fetch from PubMed';
        fetchButton.disabled = false;
      });
  }
}

function createLabel(text) {
  const label = document.createElement('label');
  label.textContent = text;
  label.style.cssText = 'display: block; margin-bottom: 5px;';
  return label;
}

export function hidePubMedFetchOverlay() {
    const overlay = document.getElementById('pubmed-fetch-overlay');
    if (overlay) {
        overlay.remove();
    }
    // Also remove the style element we added
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
        if (style.textContent.includes('spin')) {
            style.remove();
        }
    });
}

export function deleteFromData(pmid) {
  const index = data.findIndex(item => item.PMID === pmid);
  if (index !== -1) {
    data.splice(index, 1);
  }
  return data;
}

export function exportFilteredData() {
  const currentData = getData();
  
  if (!currentData || currentData.length === 0) {
    alert("No data available to export");
    return;
  }

  try {
    // Get all unique field names from all items
    const allFields = new Set();
    currentData.forEach(item => {
      Object.keys(item).forEach(field => {
        if (field !== 'cubeRef') { // Exclude Three.js references
          allFields.add(field);
        }
      });
    });

    // Convert to CSV
    const fields = Array.from(allFields);
    const csvRows = [
      fields.join(','), // header row
      ...currentData.map(item => 
        fields.map(field => 
          `"${String(item[field] || '').replace(/"/g, '""')}"`
        ).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pubmed_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please check console for details.');
  }
}

function getCleanExportData(data) {
  return data.map(item => {
    const clean = {};
    Object.keys(item).forEach(key => {
      // Only include non-object properties (except Date)
      if (typeof item[key] !== 'object' || item[key] instanceof Date) {
        clean[key] = item[key];
      }
    });
    return clean;
  });
}

// dataManager.js end
