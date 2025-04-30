import { createScene } from './createScene.js';
import { createCube } from './createCube.js';
import { applyPropertiesToCube } from './changeCube.js';

async function init() {
    const { scene, camera, renderer } = createScene();
    
    const data = await d3.csv("pubmed_data.csv");
    const cube = createCube(data[0]);
    scene.add(cube);

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

init();
