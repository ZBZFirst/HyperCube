    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI } from './uiManager.js';
import { loadData, exportFilteredData, populateDataTable } from './dataManager.js';
import { 
    createCubesFromData, 
    highlightCubeByPmid, 
    deleteSelectedCube,
    toggleIncludeArticle,
    getCubes,
    updateCubeVisibility,
    positionCubes,
    centerCameraOnCube
} from './cubeManager.js';

let scene, renderer, sceneObjects;
let cubes = [];

async function init() {
    // Initialize scene with controls
    sceneObjects = createScene();
    scene = sceneObjects.scene;
    renderer = sceneObjects.renderer;

    // Load data
    const data = await loadData("pubmed_data.csv");
    
    // Setup UI
    const ui = createUI(data, {
        onSelect: (pmid) => {
            const cube = highlightCubeByPmid(pmid);
            if (cube) centerCameraOnCube(cube);
        },
        onSearch: (term) => {
            console.log("Searching for:", term);
            // Implement search filtering
        },
        onExport: () => {
            exportFilteredData();
        },
        onDelete: () => {
            deleteSelectedCube();
            ui.updateTable(data.filter(d => 
                getCubes().some(c => c.userData.pmid === d.PMID)
            ));
        },
        onToggleInclude: () => {
            const selectedCube = getCubes().find(c => c === highlightCubeByPmid());
            if (selectedCube) {
                toggleIncludeArticle(selectedCube.userData.pmid);
                ui.updateTable(data);
            }
        },
        onEdit: (pmid) => {
            showEditModal(pmid, ui, data);
        }
    });

    // Add this after UI initialization in your init() function
    document.getElementById('download-btn').addEventListener('click', () => {
        exportFilteredData();
    });
    
    document.getElementById('delete-btn').addEventListener('click', () => {
        if (!selectedCube) {
            alert("Please select an article first by clicking on it in the table");
            return;
        }
        deleteSelectedCube();
        ui.updateTable(getData().filter(d => 
            getCubes().some(c => c.userData.pmid === d.PMID)
        ));
    });
    
    // Create cubes
    cubes = createCubesFromData(data, scene);
    populateDataTable(data, (pmid) => {
        const cube = highlightCubeByPmid(pmid);
        if (cube) centerCameraOnCube(cube);
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        sceneObjects.updateControls(0.016);
        renderer.render(scene, sceneObjects.camera);
    }
    animate();
}

function showEditModal(pmid, ui, data) {
    const cube = getCubes().find(c => c.userData.pmid === pmid);
    if (!cube) return;

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'white';
    modal.style.padding = '20px';
    modal.style.zIndex = '1000';
    modal.style.border = '1px solid #ccc';
    
    modal.innerHTML = `
        <h3>Edit Article</h3>
        <div>
            <label>
                <input type="checkbox" ${cube.userData.includeArticle === "true" ? 'checked' : ''}>
                Include Article
            </label>
        </div>
        <div>
            <label>Rationale:</label><br>
            <textarea rows="4" cols="40">${cube.userData.rationale || ''}</textarea>
        </div>
        <div>
            <label>Tags (semicolon separated):</label><br>
            <input type="text" value="${cube.userData.tags || ''}" style="width: 100%">
        </div>
        <div style="margin-top: 10px;">
            <button id="save-changes">Save</button>
            <button id="close-modal">Close</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#save-changes').addEventListener('click', () => {
        cube.userData.includeArticle = modal.querySelector('input[type="checkbox"]').checked ? "true" : "false";
        cube.userData.rationale = modal.querySelector('textarea').value;
        cube.userData.tags = modal.querySelector('input[type="text"]').value;
        updateCubeVisibility(cube);
        positionCubes();
        document.body.removeChild(modal);
        ui.updateTable(data);
    });

    modal.querySelector('#close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

init();
    // script.js end
