import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

function setupScene() {
    const scene = new THREE.Scene();
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    scene.add(new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5));
    
    scene.add(new THREE.GridHelper(20, 20));
    scene.add(new THREE.AxesHelper(5));
    
    return scene;
}

function setupCamera(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    return camera;
}

function setupRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: container.querySelector('canvas')
    });
    
    const updateSize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        
        renderer.setSize(width, height, false);
        renderer.setPixelRatio(pixelRatio);
        return { width, height };
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    renderer.shadowMap.enabled = true;
    return renderer;
}

function setupControls(camera, renderer) {
    try {
        const controls = new PointerLockControls(camera, renderer.domElement);
        
        const keysPressed = {};
        
        document.addEventListener('keydown', (e) => {
            keysPressed[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'Control') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            keysPressed[e.key.toLowerCase()] = false;
        });

        const updateControls = (delta) => {
            if (!controls.isLocked) return;
            
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
        };

        return { controls, updateControls };
    } catch (error) {
        console.error("Controls initialization failed:", error);
        return { 
            controls: null, 
            updateControls: () => {} 
        };
    }
}

function setupPointerLock(controls, renderer) {
    document.addEventListener('click', (event) => {
        const uiElement = document.getElementById('data-container');
        if (!uiElement.contains(event.target) && controls) {
            controls.lock().catch(e => {
                console.log("Pointer lock error:", e);
            });
        }
    });
}

export function createScene() {
    const container = document.getElementById('graphics-container');
    
    const scene = setupScene();
    const camera = setupCamera(container);
    const renderer = setupRenderer(container);
    const { controls, updateControls } = setupControls(camera, renderer);
    
    if (controls) {
        setupPointerLock(controls, renderer);
    }

    return { 
        scene,
        camera,
        renderer,
        controls,
        updateControls
    };
}
