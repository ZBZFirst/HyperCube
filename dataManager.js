// dataManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

let data = [];

export async function loadData(url) {
    try {
        data = await d3.csv(url);
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
    
    return table;
}

export function getData() {
    return data;
}
// dataManager.js end
