    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { createScene } from './createScene.js';
import { createCube } from './createCube.js';
import { applyPropertiesToCube } from './changeCube.js';

async function init() {
    const { scene, camera, renderer, updateControls } = createScene();

    const clock = new THREE.Clock(); // Add this line
    const data = await d3.csv("pubmed_data.csv");
    const cube = createCube();
    scene.add(cube);

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.y += 0.01;
        const delta = clock.getDelta();
        updateControls(delta);
        renderer.render(scene, camera);
    }
    animate();
}
init();
    // script.js end
