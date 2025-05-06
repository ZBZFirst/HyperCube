import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { highlightCubeByPmid } from './cubeManager.js';
import { updateTextZone } from './dataManager.js';

export function setupTraditionalControls(camera, renderer, scene) {
    const controls = new PointerLockControls(camera, renderer.domElement);
    const velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3;
    
    // Track all active projectiles
    const activeProjectiles = new Set();
    
    // Keyboard controls
    const keysPressed = {};
    
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'Control') e.preventDefault();
        
        // Add shape generation on 'g' key press
        if (e.key.toLowerCase() === 'g') {
            generateShape(camera, scene);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    // Lock controls on click
    renderer.domElement.addEventListener('click', () => {
        if (controls.isLocked) return;
        controls.lock().catch(e => {
            console.log("Pointer lock failed:", e);
        });
    });

    function update(delta) {
        const forward = (keysPressed['w'] ? -1 : 0) + (keysPressed['s'] ? 1 : 0);
        const right = (keysPressed['d'] ? 1 : 0) + (keysPressed['a'] ? -1 : 0);
        const up = (keysPressed[' '] ? 1 : 0) + (keysPressed['control'] ? -1 : 0);
        
        velocity.set(
            right * speed * delta,
            up * altitudeSpeed * delta,
            forward * speed * delta
        );
        
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    }
    
    // Function to generate a new shape
    function generateShape(camera, scene) {
        // Create a simple cube
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        
        // Position the cube at the camera's location
        cube.position.copy(camera.position);
        
        // Get camera direction
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        
        // Add cube to scene
        scene.add(cube);
        activeProjectiles.add(cube);
        
        // Set up movement parameters
        const maxDistance = 20;
        const speed = 0.2;
        let distanceTraveled = 0;
        
        // Set timeout for max lifetime (5 seconds)
        const timeoutId = setTimeout(() => {
            if (scene.children.includes(cube)) {
                scene.remove(cube);
            }
            activeProjectiles.delete(cube);
        }, 5000);
        
        // Animation function
        function animateCube() {
            if (distanceTraveled < maxDistance && scene.children.includes(cube)) {
                cube.position.add(direction.clone().multiplyScalar(speed));
                distanceTraveled += speed;
                
                // Check for collisions with other cubes
                if (checkCollisions(cube, scene)) {
                    // If collision occurred, remove the projectile
                    scene.remove(cube);
                    activeProjectiles.delete(cube);
                    clearTimeout(timeoutId);
                    return;
                }
                
                requestAnimationFrame(animateCube);
            } else {
                scene.remove(cube);
                activeProjectiles.delete(cube);
                clearTimeout(timeoutId);
            }
        }
        
        animateCube();
    }
    
    function checkCollisions(cube, scene) {
        let collisionOccurred = false;
        
        scene.children.forEach(object => {
            if (object !== cube && object.userData && object.userData.pmid) {
                if (cube.position.distanceTo(object.position) < 1) {
                    // Select the cube that was hit
                    const result = highlightCubeByPmid(object.userData.pmid, true, [], null);
                    if (result) {
                        // Update the text zone with the selected cube's data
                        updateTextZone(object.userData);
                        collisionOccurred = true;
                    }
                }
            }
        });
        
        return collisionOccurred;
    }
    
    return { controls, update };
}
