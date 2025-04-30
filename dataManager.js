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

export function populateDataTable(data, onRowClick) {
    const table = d3.select('#data-table tbody');
    table.selectAll('tr').remove();
    const rows = table.selectAll('tr')
        .data(data)
        .enter()
        .append('tr')
        .on('click', function(event, d) {
            d3.selectAll('tr').classed('selected', false);
            d3.select(this).classed('selected', true);
            onRowClick(d.PMID);
        });
    
    rows.append('td').text(d => d.PMID);
    rows.append('td').text(d => d.Title?.substring(0, 30) + '...');
    rows.append('td').text(d => d.includeArticle === "true" ? "✓" : "✗");
    return table;
}

export function getData() {
    return data;
}

export function exportFilteredData() {
    const filteredData = data.filter(item => item.includeArticle === "true");
    const csvContent = d3.csvFormat(filteredData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'filtered_articles.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// dataManager.js end
