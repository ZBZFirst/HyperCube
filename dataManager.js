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

function showPubMedFetchOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'pubmed-fetch-overlay';
    overlay.style.position = 'fixed';  // Changed to fixed to cover whole screen
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
    overlay.style.zIndex = '10000';  // Higher z-index to ensure it's on top
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = 'white';
    overlay.style.padding = '20px';
    overlay.style.boxSizing = 'border-box';

    // Create form container
    const form = document.createElement('div');
    form.style.width = '100%';
    form.style.maxWidth = '500px';
    form.style.backgroundColor = '#222';
    form.style.padding = '30px';
    form.style.borderRadius = '10px';
    form.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Fetch PubMed Data';
    title.style.marginTop = '0';
    title.style.textAlign = 'center';
    form.appendChild(title);

    // Search Term Input
    const searchTermLabel = document.createElement('label');
    searchTermLabel.textContent = 'Search Term:';
    searchTermLabel.style.display = 'block';
    searchTermLabel.style.marginBottom = '5px';
    form.appendChild(searchTermLabel);

    const searchTermInput = document.createElement('input');
    searchTermInput.type = 'text';
    searchTermInput.id = 'pubmed-search-term';
    searchTermInput.value = 'Liquid Mechanical Ventilation Life Support Humans';
    searchTermInput.style.width = '100%';
    searchTermInput.style.padding = '10px';
    searchTermInput.style.marginBottom = '20px';
    searchTermInput.style.borderRadius = '5px';
    searchTermInput.style.border = 'none';
    form.appendChild(searchTermInput);

    // API Key Input
    const apiKeyLabel = document.createElement('label');
    apiKeyLabel.textContent = 'PubMed API Key (optional):';
    apiKeyLabel.style.display = 'block';
    apiKeyLabel.style.marginBottom = '5px';
    form.appendChild(apiKeyLabel);

    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'text';
    apiKeyInput.id = 'pubmed-api-key';
    apiKeyInput.placeholder = 'Leave blank to use default';
    apiKeyInput.style.width = '100%';
    apiKeyInput.style.padding = '10px';
    apiKeyInput.style.marginBottom = '30px';
    apiKeyInput.style.borderRadius = '5px';
    apiKeyInput.style.border = 'none';
    form.appendChild(apiKeyInput);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'space-between';
    buttonsContainer.style.gap = '10px';

    // Fetch Button
    const fetchButton = document.createElement('button');
    fetchButton.textContent = 'Fetch from PubMed';
    fetchButton.style.padding = '10px 20px';
    fetchButton.style.backgroundColor = '#4CAF50';
    fetchButton.style.color = 'white';
    fetchButton.style.border = 'none';
    fetchButton.style.borderRadius = '5px';
    fetchButton.style.cursor = 'pointer';
    fetchButton.style.flex = '1';
    fetchButton.onclick = async () => {
        fetchButton.disabled = true;
        fetchButton.textContent = 'Fetching...';
        fetchButton.style.backgroundColor = '#2E7D32';
        
        try {
            const searchTerm = searchTermInput.value.trim();
            const apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;
            
            // Show loading spinner
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.style.border = '5px solid rgba(255,255,255,0.3)';
            spinner.style.borderTop = '5px solid #fff';
            spinner.style.borderRadius = '50%';
            spinner.style.width = '30px';
            spinner.style.height = '30px';
            spinner.style.animation = 'spin 1s linear infinite';
            spinner.style.margin = '20px auto';
            form.appendChild(spinner);
            
            const data = await fetchPubMedData(searchTerm, apiKey);
            hidePubMedFetchOverlay();
            return data;
        } catch (error) {
            console.error("PubMed fetch failed:", error);
            fetchButton.textContent = 'Try Again';
            fetchButton.style.backgroundColor = '#f44336';
            fetchButton.disabled = false;
            return null;
        }
    };
    buttonsContainer.appendChild(fetchButton);

    // Cancel Button (load from CSV instead)
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Load from CSV';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.backgroundColor = '#f44336';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '5px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.flex = '1';
    cancelButton.onclick = () => {
        hidePubMedFetchOverlay();
        return null; // Signal to load from CSV
    };
    buttonsContainer.appendChild(cancelButton);

    form.appendChild(buttonsContainer);
    overlay.appendChild(form);
    document.body.appendChild(overlay);

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Focus on search term input
    searchTermInput.focus();

    return overlay;
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
