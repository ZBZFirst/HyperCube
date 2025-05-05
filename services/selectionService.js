import { SelectionState } from '../state/selectionState.js';
import { highlightCubeByPmid } from '../core/cubeManager.js';

export const SelectionService = {
  toggleSelection: (pmid, selected) => {
    if (selected) {
      SelectionState.add(pmid);
    } else {
      SelectionState.remove(pmid);
    }
    highlightCubeByPmid(pmid, selected);
  },
  
  clearSelections: () => {
    SelectionState.clear();
    // Additional cleanup logic
  }
};
