// selectionManager.js
import { highlightCubeByPmid, centerCameraOnCube } from './cubeManager.js';
import { updateTextZone, clearTextZone } from './dataManager.js';

export function handleSelection(pmid, isSelected, selectedCubes, lastSelectedCube) {
    const result = highlightCubeByPmid(pmid, isSelected, selectedCubes, lastSelectedCube);
    if (!result) return { selectedCubes, lastSelectedCube };

    if (isSelected && result.cube) {
        centerCameraOnCube(result.cube);
        updateTextZone(result.cube.userData);
    } else if (result.selectedCubes.length === 0) {
        clearTextZone();
    } else if (result.lastSelectedCube) {
        updateTextZone(result.lastSelectedCube.userData);
    }

    return result;
}
