// uiManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

export function createUI(callbacks) {
    const uiContainer = d3.select('#data-container');
    
    return {
        updateTable: (data) => {
            const tbody = d3.select('#data-table tbody');
            tbody.selectAll('tr').remove();
            
            const rows = tbody.selectAll('tr')
                .data(data)
                .enter()
                .append('tr')
                .attr('data-pmid', d => d.PMID);
                
            rows.append('td')
                .text(d => d.Title?.substring(0, 50) + (d.Title?.length > 50 ? '...' : ''));
                
            rows.append('td')
                .append('input')
                .attr('type', 'checkbox')
                .attr('class', 'select-checkbox')
                .on('change', function(event, d) {
                    const isSelected = event.target.checked;
                    d3.select(this.closest('tr')).classed('selected', isSelected);
                    callbacks.onSelect(d.PMID, isSelected);
                });
        }
    };
}




// uiManager.js end
