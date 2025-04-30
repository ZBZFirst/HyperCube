    // script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createCube } from './createCube.js';
import { applyPropertiesToCube } from './changeCube.js';

let scene, camera, renderer;
let cubes = []; // Store all cubes
let data = []; // Store CSV data
let selectedCube = null;

async function init() {
  // Initialize scene first
  const sceneObjects = createScene();
  scene = sceneObjects.scene;
  camera = sceneObjects.camera;
  renderer = sceneObjects.renderer;
  const clock = new THREE.Clock();

  try {
    // Load and process data
    data = await d3.csv("pubmed_data.csv");
    
    // Create cubes AFTER data is loaded
    createCubesFromData(data);
    populateDataTable(data);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      
      // Only rotate cubes if they exist
      if (cubes.length > 0) {
        cubes.forEach(cube => {
          cube.rotation.x += 0.005;
          cube.rotation.y += 0.01;
        });
      }
      
      const delta = clock.getDelta();
      sceneObjects.updateControls(delta);
      renderer.render(scene, camera);
    }
    
    animate();
  } catch (error) {
    console.error("Error loading data:", error);
    // Fallback - create at least one cube if data fails to load
    const fallbackCube = createCube({
      PMID: "000000",
      Title: "Data failed to load",
      PubYear: new Date().getFullYear()
    }, []);
    scene.add(fallbackCube);
    cubes.push(fallbackCube);
  }
}

function createCubesFromData(data) {
  // Clear existing cubes
  cubes.forEach(cube => scene.remove(cube));
  cubes = [];

  // Create cubes in a grid layout
  const gridSize = Math.ceil(Math.sqrt(data.length));
  const spacing = 2.5;

  // Create new cubes from data
  if (data && data.length > 0) {
    cubes = data.map(row => {
      const cube = createCube(row, data);
      scene.add(cube);
      return cube;
    });
  } else {
    console.warn("No data available to create cubes");
  }
}

function populateDataTable(data) {
  const table = d3.select('#data-table tbody');
  table.selectAll('tr').remove();

  const rows = table.selectAll('tr')
    .data(data)
    .enter()
    .append('tr')
    .on('click', function(event, d) {
      // Highlight table row
      d3.selectAll('tr').classed('selected', false);
      d3.select(this).classed('selected', true);

      // Highlight corresponding cube
      if (selectedCube) {
        selectedCube.material.emissive.setHex(0x000000);
      }
      
      selectedCube = cubes.find(c => c.userData.pmid === d.PMID);
      if (selectedCube) {
        selectedCube.material.emissive.setHex(0xffff00); // Yellow highlight
        centerCameraOnCube(selectedCube);
      }
    });

  rows.append('td').text(d => d.PMID);
  rows.append('td').text(d => d.Title?.substring(0, 30) + '...');
}

function centerCameraOnCube(cube) {
  // Create animation to look at cube
  const targetPosition = cube.position.clone();
  targetPosition.y += 1; // Look slightly above the cube
  targetPosition.z += 5; // Move camera back

  // Simple animation (for better results, use GSAP or similar)
  camera.position.lerp(targetPosition, 0.1);
  camera.lookAt(cube.position);
}

init();
    // script.js end
