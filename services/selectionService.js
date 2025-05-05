import { SelectionState } from '../state/selectionState';
import { highlightCubeByPmid } from '../core/cubeManager';

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
