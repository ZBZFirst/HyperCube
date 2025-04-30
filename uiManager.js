// uiManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export function createUI(data, callbacks) {
    const uiContainer = d3.select('#ui');
    uiContainer.selectAll('*').remove();

    // Create control buttons container
    const controls = uiContainer.append('div').attr('class', 'controls');
    
    // Download button
    controls.append('button')
        .text('Download CSV')
        .on('click', callbacks.onExport);

    // Delete button
    controls.append('button')
        .text('Delete Selected')
        .on('click', callbacks.onDelete);

    // Article table
    const table = uiContainer.append('table').attr('id', 'data-table');
    table.append('thead').append('tr')
        .selectAll('th')
        .data(['PMID', 'Title', 'Included'])
        .enter()
        .append('th')
        .text(d => d);

    const tbody = table.append('tbody');

    return {
        updateTable: (filteredData) => {
            const rows = tbody.selectAll('tr')
                .data(filteredData)
                .join('tr')
                .on('click', (_, d) => callbacks.onSelect(d.PMID));

            rows.selectAll('td')
                .data(d => [d.PMID, d.Title?.substring(0, 30) + '...', 
                      d.includeArticle === "true" ? "✓" : "✗"])
                .join('td')
                .text(d => d);
        }
    };
}




// uiManager.js end
