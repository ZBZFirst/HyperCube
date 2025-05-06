// uiManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { loadData, populateDataTable, updateTextZone, attemptPubMedFetch, getData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';

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

export function setupUI(data, getSelectedCubes, getLastSelectedCube, onSelectCallback) {
    populateDataTable(data, (pmid, isSelected) => {
        const currentSelected = getSelectedCubes();
        const currentLast = getLastSelectedCube();
        
        const result = highlightCubeByPmid(pmid, isSelected, currentSelected, currentLast);
        
        if (result) {
            onSelectCallback(result.selectedCubes, result.lastSelectedCube);
            
            // Use result.selectedCubes instead of undefined selectedCubes
            if (isSelected && result.cube) {
                updateTextZone(result.cube.userData);
                centerCameraOnCube(result.cube);
            } else if (result.selectedCubes.length === 0) {
                clearTextZone();
            } else if (result.lastSelectedCube) {
                updateTextZone(result.lastSelectedCube.userData);
            }
        }
    });
}

export function setupSplitters() {
  const verticalSplitter = document.getElementById('vertical-splitter');
  const horizontalSplitter = document.getElementById('horizontal-splitter');
  const mainContent = document.getElementById('main-content');
    
  if (!mainContent.style.gridTemplateColumns) {
    mainContent.style.gridTemplateColumns = 'minmax(150px, 300px) 8px 1fr';
  }
  if (!mainContent.style.gridTemplateRows) {
    mainContent.style.gridTemplateRows = '1fr 8px minmax(100px, 200px)';
  }

  verticalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const gridTemplateColumns = mainContent.style.gridTemplateColumns || 
                              window.getComputedStyle(mainContent).gridTemplateColumns;
    const startWidth = parseInt(gridTemplateColumns.split(' ')[0]);

    function doDrag(e) {
      const newWidth = startWidth + (e.clientX - startX);
      mainContent.style.gridTemplateColumns = `${Math.max(150, newWidth)}px 8px 1fr`;
    }

    function stopDrag() {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  });

  horizontalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startY = e.clientY;
    // Get computed style if inline style isn't set
    const gridTemplateRows = mainContent.style.gridTemplateRows || 
                           window.getComputedStyle(mainContent).gridTemplateRows;
    const startHeight = parseInt(gridTemplateRows.split(' ')[2]);

    function doDrag(e) {
      const newHeight = startHeight - (e.clientY - startY);
      mainContent.style.gridTemplateRows = `1fr 8px ${Math.max(100, newHeight)}px`;
    }

    function stopDrag() {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  });
}

export function showLoadingIndicator() {
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.style.position = 'fixed';
    loader.style.top = '20px';
    loader.style.right = '20px';
    loader.style.padding = '10px';
    loader.style.background = 'rgba(0,0,0,0.7)';
    loader.style.color = 'white';
    loader.style.borderRadius = '5px';
    loader.textContent = 'Loading...';
    document.body.appendChild(loader);
}

export function removeLoadingIndicator() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.remove();
}

export function showErrorToUser(message) {
    alert(`Error: ${message}`);
}

export function clearTextZone() {
    document.getElementById('selected-title').textContent = 'No article selected';
    document.getElementById('pmid-text').textContent = '-';
    document.getElementById('year-text').textContent = '-';
    document.getElementById('source-text').textContent = '-';
    document.getElementById('doi-link').textContent = '-';
    document.getElementById('pmc-link').textContent = '-';
    document.getElementById('abstract-text').textContent = 'Select an article to view its abstract';
}

export function createFallbackScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 5;
    
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}
// uiManager.js end
