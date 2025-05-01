import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupCameraControls(camera, renderer) {
    const controls = new PointerLockControls(camera, renderer.domElement);
    const velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3;
    
    // Touch controls state
    const touchState = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false
    };
    
    // Lock controls on tap
    renderer.domElement.addEventListener('click', () => controls.lock());
    
    // Create mobile control UI
    function createMobileControls() {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.width = '100%';
        container.style.display = 'flex';
        container.style.justifyContent = 'space-between';
        container.style.padding = '0 20px';
        container.style.boxSizing = 'border-box';
        container.style.zIndex = '1000';
        
        // Movement pad (left side)
        const movePad = document.createElement('div');
        movePad.style.width = '150px';
        movePad.style.height = '150px';
        movePad.style.position = 'relative';
        movePad.style.touchAction = 'none';
        
        // Center position indicator
        const center = document.createElement('div');
        center.style.width = '30px';
        center.style.height = '30px';
        center.style.backgroundColor = 'rgba(255,255,255,0.3)';
        center.style.borderRadius = '50%';
        center.style.position = 'absolute';
        center.style.top = '50%';
        center.style.left = '50%';
        center.style.transform = 'translate(-50%, -50%)';
        movePad.appendChild(center);
        
        // Movement buttons (right side)
        const actionButtons = document.createElement('div');
        actionButtons.style.display = 'flex';
        actionButtons.style.flexDirection = 'column';
        actionButtons.style.gap = '10px';
        
        // Up/down buttons
        const upBtn = createButton('↑', () => touchState.up = true, () => touchState.up = false);
        const downBtn = createButton('↓', () => touchState.down = true, () => touchState.down = false);
        
        actionButtons.appendChild(upBtn);
        actionButtons.appendChild(downBtn);
        
        container.appendChild(movePad);
        container.appendChild(actionButtons);
        document.body.appendChild(container);
        
        // Touch event handlers for movement pad
        let activeTouchId = null;
        
        movePad.addEventListener('touchstart', (e) => {
            if (activeTouchId !== null) return;
            const touch = e.touches[0];
            activeTouchId = touch.identifier;
            handleTouchMove(touch);
        }, { passive: false });
        
        movePad.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    handleTouchMove(e.changedTouches[i]);
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });
        
        movePad.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    resetMovement();
                    activeTouchId = null;
                    break;
                }
            }
        }, { passive: false });
        
        function handleTouchMove(touch) {
            const rect = movePad.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const deltaX = touch.clientX - centerX;
            const deltaY = touch.clientY - centerY;
            
            // Deadzone to prevent accidental movement
            const deadzone = 20;
            
            // Reset all directions
            resetMovement();
            
            // Determine direction based on touch position
            if (Math.abs(deltaX) > deadzone || Math.abs(deltaY) > deadzone) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // Left/right movement
                    touchState.left = deltaX < -deadzone;
                    touchState.right = deltaX > deadzone;
                } else {
                    // Forward/backward movement
                    touchState.forward = deltaY < -deadzone;
                    touchState.backward = deltaY > deadzone;
                }
            }
        }
        
        function resetMovement() {
            touchState.forward = false;
            touchState.backward = false;
            touchState.left = false;
            touchState.right = false;
        }
    }
    
    function createButton(label, onStart, onEnd) {
        const button = document.createElement('button');
        button.textContent = label;
        button.style.width = '60px';
        button.style.height = '60px';
        button.style.fontSize = '24px';
        button.style.border = 'none';
        button.style.borderRadius = '50%';
        button.style.backgroundColor = 'rgba(255,255,255,0.3)';
        button.style.color = 'white';
        button.style.touchAction = 'manipulation';
        
        button.addEventListener('touchstart', (e) => {
            onStart();
            e.preventDefault();
        }, { passive: false });
        
        button.addEventListener('touchend', (e) => {
            onEnd();
            e.preventDefault();
        }, { passive: false });
        
        button.addEventListener('touchcancel', (e) => {
            onEnd();
            e.preventDefault();
        }, { passive: false });
        
        return button;
    }
    
    // Initialize mobile controls if on mobile
    if ('ontouchstart' in window || navigator.maxTouchPoints) {
        createMobileControls();
    } else {
        // Fallback to keyboard controls for desktop
        const keysPressed = {};
        document.addEventListener('keydown', (e) => {
            keysPressed[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'Control') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            keysPressed[e.key.toLowerCase()] = false;
        });
        
        // Override touchState with keyboard input
        Object.assign(touchState, {
            get forward() { return keysPressed['w']; },
            get backward() { return keysPressed['s']; },
            get left() { return keysPressed['a']; },
            get right() { return keysPressed['d']; },
            get up() { return keysPressed[' ']; },
            get down() { return keysPressed['control']; }
        });
    }
    
    function update(delta) {
        velocity.set(0, 0, 0);
        
        if (touchState.forward) velocity.z -= speed * delta;
        if (touchState.backward) velocity.z += speed * delta;
        if (touchState.left) velocity.x -= speed * delta;
        if (touchState.right) velocity.x += speed * delta;
        if (touchState.up) velocity.y += altitudeSpeed * delta;
        if (touchState.down) velocity.y -= altitudeSpeed * delta;
        
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    }
    
    return { controls, update };
}
