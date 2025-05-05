// createScene.js start
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

function setupScene() {
    const scene = new THREE.Scene();
    
    // Improved lighting
    scene.add(new THREE.AmbientLight(0x404040)); // softer ambient light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Enhanced grid helper with labels
    const gridSize = 100;
    const gridDivisions = 20;
    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x555555, 0x333333);
    grid.position.y = -0.01; // slightly below objects to avoid z-fighting
    scene.add(grid);
    
    // Add axis labels
    addAxisLabels(scene, gridSize/2);
    
    // Add legend
    addLegend(scene);
    
    return scene;
}

function setupCamera(container) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 1.6, 5);
    return camera;
}

function addAxisLabels(scene, size) {
    const loader = new THREE.TextureLoader();
    const labelMaterial = new THREE.SpriteMaterial({ 
        map: loader.load('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100%" height="100%" fill="rgba(0,0,0,0.7)"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">X</text></svg>'),
        transparent: true
    });
    
    // X Axis
    const xLabel = new THREE.Sprite(labelMaterial);
    xLabel.position.set(size + 2, 1, 0);
    xLabel.scale.set(4, 2, 1);
    scene.add(xLabel);
    
    // Y Axis
    const yLabel = new THREE.Sprite(labelMaterial);
    yLabel.position.set(0, size + 2, 0);
    yLabel.scale.set(4, 2, 1);
    yLabel.material.map = loader.load('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100%" height="100%" fill="rgba(0,0,0,0.7)"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">Y</text></svg>');
    scene.add(yLabel);
    
    // Z Axis
    const zLabel = new THREE.Sprite(labelMaterial);
    zLabel.position.set(0, 1, size + 2);
    zLabel.scale.set(4, 2, 1);
    zLabel.material.map = loader.load('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100%" height="100%" fill="rgba(0,0,0,0.7)"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">Z</text></svg>');
    scene.add(zLabel);
    
    // Add tick marks
    const tickSize = 0.5;
    const tickGeometry = new THREE.BoxGeometry(tickSize, tickSize, tickSize);
    const tickMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // X axis ticks
    for (let i = -size; i <= size; i += size/5) {
        if (i !== 0) {
            const tick = new THREE.Mesh(tickGeometry, tickMaterial);
            tick.position.set(i, 0, 0);
            scene.add(tick);
            
            // Add number label
            addNumberLabel(scene, i, i + 1, 0, 0);
        }
    }
    
    // Z axis ticks
    for (let i = -size; i <= size; i += size/5) {
        if (i !== 0) {
            const tick = new THREE.Mesh(tickGeometry, tickMaterial);
            tick.position.set(0, 0, i);
            scene.add(tick);
            
            // Add number label
            addNumberLabel(scene, 0, 0, i + 1, i);
        }
    }
}

function addNumberLabel(scene, x, y, z, value) {
    const loader = new THREE.TextureLoader();
    const labelMaterial = new THREE.SpriteMaterial({ 
        map: loader.load(`data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30"><rect width="100%" height="100%" fill="rgba(0,0,0,0.5)"/><text x="50%" y="50%" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dominant-baseline="middle">${value}</text></svg>`),
        transparent: true
    });
    
    const label = new THREE.Sprite(labelMaterial);
    label.position.set(x, y, z);
    label.scale.set(2, 1, 1);
    scene.add(label);
}

function addLegend(scene) {
    // Create legend container
    const legendGroup = new THREE.Group();
    legendGroup.position.set(-45, 5, -45);
    
    // Legend background
    const legendBackground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 15),
        new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            opacity: 0.7,
            transparent: true,
            side: THREE.DoubleSide
        })
    );
    legendBackground.rotation.x = -Math.PI / 2;
    legendBackground.position.y = 0.1;
    legendGroup.add(legendBackground);
    
    // Add title
    const titleTexture = createTextTexture("Data Legend", 24);
    const title = new THREE.Sprite(new THREE.SpriteMaterial({ map: titleTexture, transparent: true }));
    title.position.set(0, 0.2, 6);
    title.scale.set(8, 1.5, 1);
    legendGroup.add(title);
    
    // Add color scale explanation
    const colorTexture = createTextTexture("Color: Publication Year", 16);
    const colorLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: colorTexture, transparent: true }));
    colorLabel.position.set(0, 0.2, 3);
    colorLabel.scale.set(6, 1, 1);
    legendGroup.add(colorLabel);
    
    // Add size explanation
    const sizeTexture = createTextTexture("Size: Citation Count", 16);
    const sizeLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: sizeTexture, transparent: true }));
    sizeLabel.position.set(0, 0.2, 0);
    sizeLabel.scale.set(6, 1, 1);
    legendGroup.add(sizeLabel);
    
    // Add position explanation
    const posTexture = createTextTexture("Position: Data Attributes", 16);
    const posLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: posTexture, transparent: true }));
    posLabel.position.set(0, 0.2, -3);
    posLabel.scale.set(6, 1, 1);
    legendGroup.add(posLabel);
    
    // Add color scale visualization
    const colorScale = new THREE.Mesh(
        new THREE.PlaneGeometry(15, 1),
        new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            vertexColors: true,
            color: 0xffffff
        })
    );
    colorScale.rotation.x = -Math.PI / 2;
    colorScale.position.set(0, 0.1, 1.5);
    
    // Create gradient colors
    const colors = [];
    const colorCount = 20;
    for (let i = 0; i <= colorCount; i++) {
        const t = i / colorCount;
        const color = new THREE.Color().lerpColors(
            new THREE.Color(0x1a2b6d),
            new THREE.Color(0xd62246),
            t
        );
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
    }
    
    const colorScaleGeometry = new THREE.BufferGeometry();
    colorScaleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        -7.5, 0, 0, 7.5, 0, 0,
        -7.5, 0, 1, 7.5, 0, 1
    ]), 3));
    colorScaleGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
    colorScaleGeometry.setIndex([0, 1, 2, 2, 1, 3]);
    
    const colorScaleMesh = new THREE.Mesh(
        colorScaleGeometry,
        new THREE.MeshBasicMaterial({
            vertexColors: true,
            side: THREE.DoubleSide
        })
    );
    colorScaleMesh.rotation.x = -Math.PI / 2;
    colorScaleMesh.position.set(0, 0.2, 1.5);
    legendGroup.add(colorScaleMesh);
    
    // Add year labels to color scale
    const minYearLabel = createTextSprite("1950", 12);
    minYearLabel.position.set(-7, 0.3, 1.5);
    legendGroup.add(minYearLabel);
    
    const maxYearLabel = createTextSprite(new Date().getFullYear().toString(), 12);
    maxYearLabel.position.set(7, 0.3, 1.5);
    legendGroup.add(maxYearLabel);
    
    scene.add(legendGroup);
}

function createTextTexture(text, fontSize = 16) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = `${fontSize}px Arial`;
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
}

function createTextSprite(text, fontSize = 16) {
    const texture = createTextTexture(text, fontSize);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(fontSize * 0.5, fontSize * 0.25, 1);
    return sprite;
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
            if (keysPressed['shift']) velocity.y += altitudeSpeed * delta;
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
            const promise = controls.lock();
            if (promise && promise.catch) {
                promise.catch(e => console.log("Pointer lock error:", e));
            }
        }
    });
}

export function createScene() {
    const container = document.getElementById('graphics-container');
    if (!container) {
        console.error('Graphics container not found!');
        return null;
    }

    // Verify canvas exists
    const canvas = container.querySelector('canvas');
    if (!canvas) {
        console.error('Canvas element not found in graphics container!');
        return null;
    }

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
        updateControls,
        }
    };


// createScene.js end
