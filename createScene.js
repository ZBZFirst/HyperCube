import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

export function createScene() {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5); // Approx human eye height

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
    document.addEventListener('keydown', (e) => keysPressed[e.key.toLowerCase()] = true);
    document.addEventListener('keyup', (e) => keysPressed[e.key.toLowerCase()] = false);

    let velocity = new THREE.Vector3();
    const speed = 5;

    function updateControls(delta) {
        velocity.set(0, 0, 0);

        if (keysPressed['w']) velocity.z -= speed * delta;
        if (keysPressed['s']) velocity.z += speed * delta;
        if (keysPressed['a']) velocity.x -= speed * delta;
        if (keysPressed['d']) velocity.x += speed * delta;

        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
    }

    return { scene, camera, renderer, updateControls };
}
