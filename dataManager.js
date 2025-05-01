// dataManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let data = [];

export async function loadData(url) {
    try {
        data = await d3.csv(url);
        // Initialize our custom fields if they don't exist
        data.forEach(item => {
            item.includeArticle = item.includeArticle || "true";
            item.rationale = item.rationale || "";
            item.tags = item.tags || "";
        });
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

function updateCompletionStatus(item) {
  item.complete = item.Notes && item.Rating && item.Tags;
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
  
   const rows = tbody.selectAll('tr')
     .data(data)
     .enter()
     .append('tr')
     .attr('data-pmid', d => d.PMID);
    
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

    const csvContent = d3.csvFormat(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pubmed_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// dataManager.js end
