// dataManager.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchPubMedData, DEFAULT_API_KEY } from './pubmedFetcher.js';
import { showPubMedFetchOverlay, hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';

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


export function setData(newData) {
  data = newData;
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

  // Process data to combine MeSH and Keyword columns
  const processedData = data.map(item => {
    // Combine all MeSH terms (MeSH_1 to MeSH_30)
    const meshTerms = [];
    for (let i = 1; i <= 30; i++) {
      const term = item[`MeSH_${i}`];
      if (term) meshTerms.push(term);
    }
    
    // Combine all Keywords (Keyword_1 to Keyword_30)
    const keywords = [];
    for (let i = 1; i <= 30; i++) {
      const keyword = item[`Keyword_${i}`];
      if (keyword) keywords.push(keyword);
    }
    
    return {
      ...item,
      combinedMeSH: meshTerms.join('; '),
      combinedKeywords: keywords.join('; ')
    };
  });

  const rows = tbody.selectAll('tr')
    .data(processedData)
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
    
  // MeSH Terms column
  rows.append('td')
    .text(d => d.combinedMeSH || '')
    .attr('title', d => d.combinedMeSH || '')
    .classed('mesh-cell', true);
  
  // Keywords column
  rows.append('td')
    .text(d => d.combinedKeywords || '')
    .attr('title', d => d.combinedKeywords || '')
    .classed('keyword-cell', true);}

/* ========== TEXT ZONE FUNCTIONS ========== */

export function updateTextZone(article) {
    console.groupCollapsed('[updateTextZone] Updating text zone');
    
    // Input validation logging
    if (!article || typeof article !== 'object') {
        console.error('Invalid article data:', article);
        console.log('Clearing text zone due to invalid input');
        console.groupEnd();
        clearTextZone();
        return;
    }
    
    console.log('Raw article data:', JSON.parse(JSON.stringify(article)));
    
    // Create safe article data with fallbacks
    const safeArticle = {
        Title: article.Title || 'No title available',
        PMID: article.PMID || '-',
        PubYear: article.PubYear || '-',
        Source: article.Source || '-',
        DOI: article.DOI || '',
        PMC_ID: article.PMC_ID || '',
        Abstract: article.Abstract || 'No abstract available'
    };
    
    console.log('Processed article data:', safeArticle);
    
    // Update DOM elements with logging
    const updateField = (id, value) => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Element with ID ${id} not found`);
            return;
        }
        console.log(`Updating ${id}:`, value);
        element.textContent = value;
    };
    
    updateField('selected-title', safeArticle.Title);
    updateField('pmid-text', safeArticle.PMID);
    updateField('year-text', safeArticle.PubYear);
    updateField('source-text', safeArticle.Source);
    updateField('abstract-text', safeArticle.Abstract);
    
    // Handle DOI link
    const doiLink = document.getElementById('doi-link');
    if (doiLink) {
        console.log('Updating DOI link:', {
            text: safeArticle.DOI || '-',
            href: safeArticle.DOI ? `https://doi.org/${safeArticle.DOI}` : '#'
        });
        doiLink.textContent = safeArticle.DOI || '-';
        doiLink.href = safeArticle.DOI ? `https://doi.org/${safeArticle.DOI}` : '#';
    } else {
        console.error('DOI link element not found');
    }
    
    // Handle PMC link
    const pmcLink = document.getElementById('pmc-link');
    if (pmcLink) {
        console.log('Updating PMC link:', {
            text: safeArticle.PMC_ID ? `PMC${safeArticle.PMC_ID}` : '-',
            href: safeArticle.PMC_ID ? `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${safeArticle.PMC_ID}/` : '#'
        });
        pmcLink.textContent = safeArticle.PMC_ID ? `PMC${safeArticle.PMC_ID}` : '-';
        pmcLink.href = safeArticle.PMC_ID ? `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${safeArticle.PMC_ID}/` : '#';
    } else {
        console.error('PMC link element not found');
    }
    
    console.groupEnd();
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
