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

export function populateDataTable(data, onRowClick, hightlightFunction) {
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
     .on('change', function(event, d) {
       const isSelected = event.target.checked;
       d3.select(this.closest('tr')).classed('selected', isSelected);
       highlightCubeByPmid(d.PMID, isSelected);
     });

    .on('change', function(event, d) {
       const isSelected = event.target.checked;
       d3.select(this.closest('tr')).classed('selected', isSelected);
       highlightFunction(d.PMID, isSelected); // Use passed function
   });
    
}

export function getData() {
    return data;
}

export function exportFilteredData() {
    if (!data.length) {
        alert("No data available to export");
        return;
    }
    
    const filteredData = data.filter(item => 
        getCubes().some(cube => cube.userData.pmid === item.PMID)
    );
    
    if (!filteredData.length) {
        alert("No articles remaining to export");
        return;
    }

    const csvContent = d3.csvFormat(filteredData);
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
