// uiManager.js start
import * as d3 from 'd3';
import { SelectionState } from '../state/selectionState.js';

export function createTable(containerId, onSelectionChange) {
  const renderRow = (row) => {
    const isSelected = SelectionState.has(row.PMID);
    return `
      <tr data-pmid="${row.PMID}" class="${isSelected ? 'selected' : ''}">
        <td>${row.Title?.substring(0, 50)}${row.Title?.length > 50 ? '...' : ''}</td>
        <td>
          <input type="checkbox" class="select-checkbox" 
                 ${isSelected ? 'checked' : ''}
                 data-pmid="${row.PMID}">
        </td>
      </tr>
    `;
  };

  const handleCheckboxChange = (event, pmid) => {
    const checked = event.target.checked;
    onSelectionChange(pmid, checked);
  };

  return {
    update: (data) => {
      const table = d3.select(containerId)
        .selectAll('tr')
        .data(data)
        .join('tr')
        .html(renderRow);
      
      table.select('.select-checkbox')
        .on('change', (event, d) => handleCheckboxChange(event, d.PMID));
    }
  };
}




// uiManager.js end
