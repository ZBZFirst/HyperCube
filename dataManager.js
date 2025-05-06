// dataManager.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchPubMedData } from './pubmedFetcher.js';
import { showPubMedFetchOverlay, hidePubMedFetchOverlay } from './pubmedOverlay.js';

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

export function deleteSelectedFromData(pmidsToDelete) {
  if (!Array.isArray(pmidsToDelete)) return;
  data = data.filter(item => !pmidsToDelete.includes(item.PMID));
  return data;
}

export function deleteFromData(pmid) {
  const index = data.findIndex(item => item.PMID === pmid);
  if (index !== -1) data.splice(index, 1);
  return data;
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

/* ========== EXPORT FUNCTIONS ========== */

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

export function showPubMedFetchOverlay() {
  // Create overlay container with modern styling
  const overlay = document.createElement('div');
  overlay.id = 'pubmed-fetch-overlay';
  overlay.className = 'pubmed-overlay';
  
  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'pubmed-modal';
  
  // Add title
  const title = document.createElement('h2');
  title.textContent = 'Fetch PubMed Data';
  title.className = 'modal-title';
  
  // Create form
  const form = document.createElement('form');
  form.className = 'pubmed-form';
  
  // Search term input
  const searchGroup = createFormGroup(
    'Search Term:', 
    'pubmed-search-term', 
    'text', 
    'Liquid Mechanical Ventilation Life Support Humans'
  );
  
  // API key input
  const apiKeyGroup = createFormGroup(
    'PubMed API Key (optional):', 
    'pubmed-api-key', 
    'text', 
    '', 
    `Default key will be used if left blank`
  );
  
  // Action buttons
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'button-group';
  
  const fetchBtn = createButton('Fetch from PubMed', 'primary', handleFetch);
  const cancelBtn = createButton('Load from CSV', 'secondary', hidePubMedFetchOverlay);
  
  buttonGroup.append(fetchBtn, cancelBtn);
  
  // Loading indicator
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.display = 'none';
  
  // Assemble the modal
  form.append(searchGroup, apiKeyGroup, buttonGroup, spinner);
  modal.append(title, form);
  overlay.appendChild(modal);
  
  // Add to DOM
  document.body.appendChild(overlay);
  
  // Focus on search input
  searchGroup.querySelector('input').focus();
  
  // Add CSS dynamically
  addOverlayStyles();
  
  return overlay;

  // Helper functions
  function createFormGroup(labelText, id, type, value, placeholder = '') {
    const group = document.createElement('div');
    group.className = 'form-group';
    
    const label = document.createElement('label');
    label.textContent = labelText;
    label.htmlFor = id;
    
    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.value = value;
    input.placeholder = placeholder;
    
    group.append(label, input);
    return group;
  }

  function createButton(text, variant, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn btn-${variant}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  async function handleFetch() {
    const fetchBtn = modal.querySelector('.btn-primary');
    const spinner = modal.querySelector('.spinner');
    const searchInput = document.getElementById('pubmed-search-term');
    const apiKeyInput = document.getElementById('pubmed-api-key');
    
    // UI feedback
    fetchBtn.disabled = true;
    spinner.style.display = 'block';
    
    try {
      const searchTerm = searchInput.value.trim();
      const apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;
      
      if (!searchTerm) {
        throw new Error('Please enter a search term');
      }
      
      return await fetchPubMedData(searchTerm, apiKey);
    } catch (error) {
      console.error("PubMed fetch failed:", error);
      showErrorInModal(error.message);
      throw error;
    } finally {
      spinner.style.display = 'none';
      fetchBtn.disabled = false;
    }
  }

  function showErrorInModal(message) {
    // Remove any existing error
    const existingError = modal.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    const errorEl = document.createElement('p');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.style.color = '#ff6b6b';
    errorEl.style.marginTop = '10px';
    
    modal.querySelector('form').appendChild(errorEl);
  }
}

function addOverlayStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .pubmed-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .pubmed-modal {
      background: #2d3436;
      border-radius: 8px;
      padding: 30px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: modalFadeIn 0.3s ease-out;
    }
    
    .modal-title {
      color: #f5f6fa;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .pubmed-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .form-group label {
      color: #dfe6e9;
      font-size: 14px;
    }
    
    .form-group input {
      padding: 12px 15px;
      border: 1px solid #636e72;
      border-radius: 4px;
      background: #3d484d;
      color: white;
      font-size: 16px;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #0984e3;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      flex: 1;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #0984e3;
      color: white;
    }
    
    .btn-primary:hover {
      background: #0779cf;
    }
    
    .btn-primary:disabled {
      background: #636e72;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #3d484d;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #2d3436;
    }
    
    .spinner {
      border: 3px solid rgba(255,255,255,0.1);
      border-top: 3px solid #0984e3;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  
  document.head.appendChild(style);
}

export function hidePubMedFetchOverlay() {
  const overlay = document.getElementById('pubmed-fetch-overlay');
  if (overlay) overlay.remove();
  
  // Remove spin animation style
  const styles = document.querySelectorAll('style');
  styles.forEach(style => {
    if (style.textContent.includes('spin')) style.remove();
  });
}
