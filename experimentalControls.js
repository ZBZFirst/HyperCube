import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupExperimentalControls(camera, renderer) {
    const controls = new PointerLockControls(camera, renderer.domElement);
    const velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3;
    
    // Movement state
    const movement = {
        forward: 0,
        right: 0,
        up: 0
    };
    
    // Initialize mobile controls
    createMobileControls();
    
    // Lock controls on tap
    renderer.domElement.addEventListener('click', () => {
        if (controls.isLocked) return;
        controls.lock().catch(e => {
            console.log("Pointer lock failed:", e);
        });
    });
    
    function update(delta) {
        velocity.set(
            movement.right * speed * delta,
            movement.up * altitudeSpeed * delta,
            movement.forward * speed * delta
        );
        
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    }
    
    return { controls, update };
    
    function createMobileControls() {
        // Create container for mobile controls
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.left = '0';
        container.style.right = '0';
        container.style.display = 'flex';
        container.style.justifyContent = 'space-between';
        container.style.padding = '0 20px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
        
        // Movement joystick
        const joystick = createJoystick(
            (x, y) => {
                movement.forward = -y;
                movement.right = x;
            },
            () => {
                movement.forward = 0;
                movement.right = 0;
            }
        );
        container.appendChild(joystick);
        
        // Altitude buttons
        const altitudeContainer = document.createElement('div');
        altitudeContainer.style.display = 'flex';
        altitudeContainer.style.flexDirection = 'column';
        altitudeContainer.style.gap = '10px';
        
        const upBtn = createButton('↑', () => movement.up = 1, () => movement.up = 0);
        const downBtn = createButton('↓', () => movement.up = -1, () => movement.up = 0);
        
        altitudeContainer.appendChild(upBtn);
        altitudeContainer.appendChild(downBtn);
        container.appendChild(altitudeContainer);
    }
    
    // ... (include createJoystick and createButton functions from your original code) ...
}
