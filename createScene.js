    // createScene.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createScene() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // Initial position (x, y, z)
    
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    const controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());

    // Pointer lock on click
    document.addEventListener('click', () => controls.lock());

    // Movement controls
    const keysPressed = {};
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        // Prevent spacebar from scrolling page
        if (e.key === ' ' || e.key === 'Control') e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    let velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3; // Speed for up/down movement

    function updateControls(delta) {
        velocity.set(0, 0, 0);

        // Ground movement
        if (keysPressed['w']) velocity.z -= speed * delta;
        if (keysPressed['s']) velocity.z += speed * delta;
        if (keysPressed['a']) velocity.x -= speed * delta;
        if (keysPressed['d']) velocity.x += speed * delta;

        // Altitude control (Space = up, Ctrl = down)
        if (keysPressed[' ']) velocity.y += altitudeSpeed * delta;
        if (keysPressed['control']) velocity.y -= altitudeSpeed * delta;

        // Apply movement
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y += velocity.y; // Directly modify Y position for altitude
    }

    return { scene, camera, renderer, updateControls };
}
    // createScene.js end
