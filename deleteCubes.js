// deleteCubes.js
import { getData, setData } from './dataManager.js';

// For data operations
export function deleteSelectedFromData(pmidsToDelete) {
    console.groupCollapsed('[deleteSelectedFromData] Deleting data for PMIDs:', pmidsToDelete);
    
    const currentData = getData();
    console.log('Current data count before deletion:', currentData.length);
    
    if (!Array.isArray(pmidsToDelete)) {
        console.warn('Invalid pmidsToDelete - expected array but got:', pmidsToDelete);
        console.groupEnd();
        return currentData;
    }
    
    const newData = currentData.filter(item => {
        const shouldKeep = !pmidsToDelete.includes(item.PMID);
        if (!shouldKeep) {
            console.log('Removing article:', { pmid: item.PMID, title: item.Title });
        }
        return shouldKeep;
    });
    
    console.log('New data count after deletion:', newData.length);
    console.log('Deleted count:', currentData.length - newData.length);
    
    setData(newData);
    console.groupEnd();
    return newData;
}

// For scene operations
export function deleteSelectedCubes(selectedCubes, scene) {
    console.groupCollapsed('[deleteSelectedCubes] Removing cubes from scene');
    
    if (!selectedCubes || !selectedCubes.length) {
        console.log('No cubes to delete');
        console.groupEnd();
        return [];
    }
    
    console.log('Deleting', selectedCubes.length, 'cubes');
    selectedCubes.forEach(cube => {
        console.log('Removing cube:', {
            pmid: cube.userData.PMID,
            position: cube.position,
            title: cube.userData.Title
        });
        scene.remove(cube);
    });
    
    console.log('Deletion complete');
    console.groupEnd();
    return [];
}
