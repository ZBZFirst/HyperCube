// uiManager.js start
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { loadData, populateDataTable, updateTextZone, attemptPubMedFetch, getData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';
import * as THREE from 'three';

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
            
            // Force text zone update for any selection change
            if (result.lastSelectedCube) {
                console.log('Updating text zone from selection change');
                updateTextZone(result.lastSelectedCube.userData);
            } else if (result.selectedCubes.length === 0) {
                console.log('Clearing text zone - no selections');
                clearTextZone();
            }
        }
    });
}

export function setupSplitters() {
  const verticalSplitter = document.getElementById('vertical-splitter');
  const horizontalSplitter = document.getElementById('horizontal-splitter');
  const mainContent = document.getElementById('main-content');
  
  console.log('Initializing splitters...'); // Debug log

  // Vertical splitter (between text and graphics)
  verticalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    console.log('Vertical splitter drag start'); // Debug log
    
    const startX = e.clientX;
    const gridTemplateColumns = window.getComputedStyle(mainContent).gridTemplateColumns;
    const columns = gridTemplateColumns.split(' ');
    const startTextWidth = parseFloat(columns[0]);
    
    function doDrag(e) {
      const newTextWidth = startTextWidth + (e.clientX - startX);
      // Ensure text container stays within min/max bounds
      const clampedWidth = Math.max(150, Math.min(300, newTextWidth));
      mainContent.style.gridTemplateColumns = `${clampedWidth}px 8px 1fr`;
    }

    function stopDrag() {
      console.log('Vertical splitter drag end'); // Debug log
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    }

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  });

  // Horizontal splitter (between graphics and data table)
  horizontalSplitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    console.log('Horizontal splitter drag start'); // Debug log
    
    const startY = e.clientY;
    const gridTemplateRows = window.getComputedStyle(mainContent).gridTemplateRows;
    const rows = gridTemplateRows.split(' ');
    const startGraphicsHeight = parseFloat(rows[0]);
    
    function doDrag(e) {
      const newGraphicsHeight = startGraphicsHeight + (e.clientY - startY);
      // Ensure graphics container stays within reasonable bounds
      const clampedHeight = Math.max(100, newGraphicsHeight);
      mainContent.style.gridTemplateRows = `${clampedHeight}px 8px minmax(100px, 200px)`;
    }

    function stopDrag() {
      console.log('Horizontal splitter drag end'); // Debug log
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
