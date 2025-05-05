let selectedItems = new Set();

export const SelectionState = {
  add: (pmid) => {
    selectedItems.add(pmid);
    console.log('Added selection:', pmid);
  },
  
  remove: (pmid) => {
    selectedItems.delete(pmid);
    console.log('Removed selection:', pmid);
  },
  
  clear: () => {
    selectedItems.clear();
    console.log('Cleared all selections');
  },
  
  has: (pmid) => selectedItems.has(pmid),
  
  getAll: () => new Set(selectedItems)
};
