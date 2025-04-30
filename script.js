    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createCube } from './createCube.js';
import { applyPropertiesToCube } from './changeCube.js';
import { createCubesFromData, highlightCubeByPmid } from './cubeManager.js';
import { loadData, populateDataTable } from './dataManager.js';
import { initCamera, centerCameraOnCube } from './cameraManager.js';

let scene, renderer;

async function init() {
    const sceneObjects = createScene();
    scene = sceneObjects.scene;
    initCamera(sceneObjects.camera);
    renderer = sceneObjects.renderer;
    const clock = new THREE.Clock();
    const data = await loadData("pubmed_data.csv");
    createCubesFromData(data, scene);
    populateDataTable(data, (pmid) => {
        const cube = highlightCubeByPmid(pmid);
        if (cube) centerCameraOnCube(cube);
    });
    function animate() {
        requestAnimationFrame(animate);
        sceneObjects.updateControls(clock.getDelta());
        renderer.render(scene, sceneObjects.camera);
    }
    animate();
}

init();
    // script.js end
