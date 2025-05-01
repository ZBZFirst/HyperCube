import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function setupCameraControls(camera, renderer) {
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
    
    // Lock controls on tap
    renderer.domElement.addEventListener('click', () => {
        if (controls.isLocked) return;
        controls.lock().catch(e => {
            console.log("Pointer lock failed:", e);
        });
    });
    
    // Create mobile controls if on mobile
    if (isMobile()) {
        createMobileControls();
    } else {
        // Keyboard controls for desktop
        const keysPressed = {};
        document.addEventListener('keydown', (e) => {
            keysPressed[e.key.toLowerCase()] = true;
            if (e.key === ' ' || e.key === 'Control') e.preventDefault();
        });
        
        document.addEventListener('keyup', (e) => {
            keysPressed[e.key.toLowerCase()] = false;
        });
        
        // Map keyboard to movement
        movement.forward = () => (keysPressed['w'] ? -1 : 0) + (keysPressed['s'] ? 1 : 0);
        movement.right = () => (keysPressed['d'] ? 1 : 0) + (keysPressed['a'] ? -1 : 0);
        movement.up = () => (keysPressed[' '] ? 1 : 0) + (keysPressed['control'] ? -1 : 0);
    }
    
    function update(delta) {
        // Get movement values (functions on desktop, numbers on mobile)
        const forward = typeof movement.forward === 'function' ? movement.forward() : movement.forward;
        const right = typeof movement.right === 'function' ? movement.right() : movement.right;
        const up = typeof movement.up === 'function' ? movement.up() : movement.up;
        
        velocity.set(
            right * speed * delta,
            up * altitudeSpeed * delta,
            forward * speed * delta
        );
        
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    }
    
    return { controls, update };
    
    // Helper functions
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
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
        
        // Movement joystick (left side)
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
        
        // Altitude buttons (right side)
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
    
    function createJoystick(onMove, onEnd) {
        const size = 100;
        const outer = document.createElement('div');
        outer.style.width = `${size}px`;
        outer.style.height = `${size}px`;
        outer.style.borderRadius = '50%';
        outer.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        outer.style.position = 'relative';
        outer.style.touchAction = 'none';
        
        const inner = document.createElement('div');
        inner.style.width = `${size/2}px`;
        inner.style.height = `${size/2}px`;
        inner.style.borderRadius = '50%';
        inner.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        inner.style.position = 'absolute';
        inner.style.top = '50%';
        inner.style.left = '50%';
        inner.style.transform = 'translate(-50%, -50%)';
        outer.appendChild(inner);
        
        let touchId = null;
        const center = { x: 0, y: 0 };
        const maxDist = size/3;
        
        outer.addEventListener('touchstart', (e) => {
            if (touchId !== null) return;
            const touch = e.touches[0];
            touchId = touch.identifier;
            const rect = outer.getBoundingClientRect();
            center.x = rect.left + rect.width/2;
            center.y = rect.top + rect.height/2;
            updateJoystick(touch.clientX, touch.clientY);
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                    e.preventDefault();
                    break;
                }
            }
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    resetJoystick();
                    onEnd();
                    touchId = null;
                    break;
                }
            }
        });
        
        function updateJoystick(x, y) {
            const dx = x - center.x;
            const dy = y - center.y;
            const dist = Math.min(maxDist, Math.sqrt(dx*dx + dy*dy));
            const angle = Math.atan2(dy, dx);
            
            const joyX = dist * Math.cos(angle);
            const joyY = dist * Math.sin(angle);
            
            inner.style.transform = `translate(calc(-50% + ${joyX}px), calc(-50% + ${joyY}px)`;
            
            // Normalize to [-1, 1] range
            const normX = joyX / maxDist;
            const normY = joyY / maxDist;
            
            onMove(normX, normY);
        }
        
        function resetJoystick() {
            inner.style.transform = 'translate(-50%, -50%)';
        }
        
        return outer;
    }
    
    function createButton(label, onStart, onEnd) {
        const button = document.createElement('button');
        button.textContent = label;
        button.style.width = '60px';
        button.style.height = '60px';
        button.style.fontSize = '24px';
        button.style.border = 'none';
        button.style.borderRadius = '50%';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
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
}
