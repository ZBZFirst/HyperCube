import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createScene() {
    const scene = new THREE.Scene();
    
    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5));
    
    // Helpers
    scene.add(new THREE.GridHelper(20, 20));
    scene.add(new THREE.AxesHelper(5));

    // Camera and Renderer
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Setup controls with UI protection
    let controls;
    try {
        controls = new PointerLockControls(camera, renderer.domElement);
    } catch (error) {
        console.error("Failed to initialize PointerLockControls:", error);
        // Provide fallback controls or disable movement
        return {
            scene,
            camera,
            renderer,
            controls: null,
            updateControls: () => {} // No-op function
        };
    }
    
    // Only activate pointer lock when clicking outside UI
    document.addEventListener('click', (event) => {
        const uiElement = document.getElementById('ui');
        if (!uiElement.contains(event.target) && controls) {
            try {
                const lockPromise = controls.lock();
                if (lockPromise) {
                    lockPromise.then(() => {
                        console.log("Pointer lock acquired");
                    }).catch(e => {
                        console.log("Pointer lock error:", e);
                    });
                } else {
                    console.warn("Pointer lock API not available");
                }
            } catch (e) {
                console.error("Error attempting pointer lock:", e);
            }
        }
    });
    
    // Movement state
    const keysPressed = {};
    document.addEventListener('keydown', (e) => {
        keysPressed[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'Control') e.preventDefault();
    });
    
    document.addEventListener('keyup', (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    });

    function updateControls(delta) {
        if (!controls || !controls.isLocked) return;
        
        const velocity = new THREE.Vector3();
        const speed = 5;
        const altitudeSpeed = 3;

        if (keysPressed['w']) velocity.z -= speed * delta;
        if (keysPressed['s']) velocity.z += speed * delta;
        if (keysPressed['a']) velocity.x -= speed * delta;
        if (keysPressed['d']) velocity.x += speed * delta;
        if (keysPressed[' ']) velocity.y += altitudeSpeed * delta;
        if (keysPressed['control']) velocity.y -= altitudeSpeed * delta;

        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y += velocity.y;
    }

    return { 
        scene,
        camera,
        renderer,
        controls,
        updateControls
    };
}
