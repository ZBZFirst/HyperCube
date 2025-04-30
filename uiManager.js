// uiManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export function createUI(data, callbacks) {
    const uiContainer = d3.select('#ui');
    uiContainer.selectAll('*').remove();

    // Control buttons
    const controls = uiContainer.append('div').attr('class', 'controls');
    controls.append('button')
        .text('Export Selected')
        .on('click', callbacks.onExport);
    
    controls.append('button')
        .text('Delete Selected')
        .on('click', callbacks.onDelete);
    
    controls.append('button')
        .text('Toggle Include')
        .on('click', callbacks.onToggleInclude);
    
    // Clear existing UI
    uiContainer.selectAll('*').remove();

    // Create tabbed interface
    uiContainer.append('div').attr('class', 'tabs')
        .selectAll('button')
        .data(['Articles', 'Filters', 'Settings'])
        .enter()
        .append('button')
        .text(d => d)
        .on('click', (_, tab) => showTab(tab));

    // Main content area
    const content = uiContainer.append('div').attr('class', 'content');

    // Article table
    const table = content.append('table').attr('id', 'data-table');
    table.append('thead').append('tr')
        .selectAll('th')
        .data(['PMID', 'Title', 'Year', 'Citations'])
        .enter()
        .append('th')
        .text(d => d);

    const tbody = table.append('tbody');
    
    // Search/filter controls
    const filters = content.append('div').attr('class', 'filters');
    filters.append('input')
        .attr('type', 'text')
        .attr('placeholder', 'Search...')
        .on('input', function() {
            const searchTerm = d3.select(this).property('value');
            callbacks.onSearch(searchTerm);
        });

    // Stats panel
    const stats = uiContainer.append('div').attr('class', 'stats');
    stats.append('p').text(`Total articles: ${data.length}`);

    function showTab(tabName) {
        // Tab switching logic
        console.log(`Showing tab: ${tabName}`);
    }

    return {
        updateTable: (filteredData) => {
            const rows = tbody.selectAll('tr')
                .data(filteredData)
                .join('tr')
                .on('dblclick', (_, d) => callbacks.onEdit(d.PMID)); // Double-click to edit

            rows.selectAll('td')
                .data(d => [d.PMID, d.Title?.substring(0, 30) + '...', 
                      d.includeArticle === "true" ? "✓" : "✗"])
                .join('td')
                .text(d => d);
        }
    };
}




// uiManager.js end
