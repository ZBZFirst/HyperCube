    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI } from './uiManager.js';
import { loadData, exportFilteredData } from './dataManager.js';
import { 
    createCubesFromData, 
    highlightCubeByPmid, 
    deleteSelectedCube,
    toggleIncludeArticle,
    getCubes
} from './cubeManager.js';

let scene, renderer;

async function init() {
    // Initialize scene with controls
    const sceneObjects = createScene();
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
            );
        },
        onToggleInclude: () => {
            if (getCubes().find(c => c.userData.pmid === selectedCube?.userData.pmid)) {
                toggleIncludeArticle(selectedCube.userData.pmid);
                ui.updateTable(data);
            }
        },
        onEdit: (pmid) => {
            showEditModal(pmid);
        }
    });

    // Create cubes
    createCubesFromData(data, scene);
    ui.updateTable(data);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        sceneObjects.updateControls(0.016); // Fixed delta for simplicity
        renderer.render(scene, sceneObjects.camera);
    }
    animate();
}

function centerCameraOnCube(cube) {
    const targetPosition = cube.position.clone();
    targetPosition.y += 1;
    targetPosition.z += 5;
    sceneObjects.camera.position.lerp(targetPosition, 0.1);
    sceneObjects.camera.lookAt(cube.position);
}

function showEditModal(pmid) {
    const cube = cubes.find(c => c.userData.pmid === pmid);
    if (!cube) return;

    const modal = document.createElement('div');
    modal.style.position = 'absolute';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = 'white';
    modal.style.padding = '20px';
    modal.style.zIndex = '1000';
    
    modal.innerHTML = `
        <h3>Edit Article</h3>
        <div>
            <label>
                <input type="checkbox" ${cube.userData.includeArticle === "true" ? 'checked' : ''}>
                Include Article
            </label>
        </div>
        <div>
            <label>Rationale:</label>
            <textarea>${cube.userData.rationale || ''}</textarea>
        </div>
        <div>
            <label>Tags (semicolon separated):</label>
            <input type="text" value="${cube.userData.tags || ''}">
        </div>
        <button id="save-changes">Save</button>
        <button id="close-modal">Close</button>
    `;

    document.body.appendChild(modal);

    document.getElementById('save-changes').addEventListener('click', () => {
        cube.userData.includeArticle = modal.querySelector('input[type="checkbox"]').checked ? "true" : "false";
        cube.userData.rationale = modal.querySelector('textarea').value;
        cube.userData.tags = modal.querySelector('input[type="text"]').value;
        updateCubeVisibility(cube);
        positionCubes();
        document.body.removeChild(modal);
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

init();
    // script.js end
