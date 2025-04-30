let scene, camera, renderer;
let cube, popup, articleData = [];

async function init() {
  popup = document.getElementById('popup');

  // 1. Setup Scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 2000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  camera.position.z = 200;

  // 2. Load CSV and convert to JSON
  const response = await fetch('pubmed_data.csv');
  const csvText = await response.text();
  articleData = parseCSVToJSON(csvText);

  // 3. Spawn cubes
  createCube(articleData[0]);

  animate();
}

// Basic CSV parser
function parseCSVToJSON(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines.shift().split(',');
  return lines.map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i];
      return obj;
    }, {});
  });
}

// Create one cube for now
function createCube(data) {
  const geometry = new THREE.BoxGeometry(50, 50, 50);
  const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
  cube = new THREE.Mesh(geometry, material);
  cube.userData = data;
  scene.add(cube);
}

// Click Handler
window.addEventListener('click', event => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const data = intersects[0].object.userData;
    showPopup(data);
  } else {
    popup.style.display = 'none';
  }
});

// Show popup
function showPopup(data) {
  popup.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
  popup.style.display = 'block';
}

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.y += 0.01;
  cube.rotation.x += 0.005;
  enforceBounds(cube);
  renderer.render(scene, camera);
}

// Limit to 1000x1000 space
function enforceBounds(obj) {
  const limit = 500;
  ['x', 'y', 'z'].forEach(axis => {
    if (Math.abs(obj.position[axis]) > limit) {
      obj.position[axis] = Math.sign(obj.position[axis]) * limit;
    }
  });
}

init();
