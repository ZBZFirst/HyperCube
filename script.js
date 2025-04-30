    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI } from './uiManager.js';
import { loadData } from './dataManager.js';
import { createCubesFromData } from './cubeManager.js';

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

init();
    // script.js end
