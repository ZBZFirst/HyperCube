import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { highlightCubeByPmid } from './cubeManager.js';
import { updateTextZone } from './dataManager.js';

export function setupTraditionalControls(camera, renderer, scene, onSelectCallback) {
    // Initialize PointerLockControls
    const controls = new PointerLockControls(camera, renderer.domElement);
    const velocity = new THREE.Vector3();
    const speed = 5;
    const altitudeSpeed = 3;
    
    // Track all active projectiles
    const activeProjectiles = new Set();
    
    // Keyboard state tracking
    const keysPressed = {};
    
    // Pointer lock state management
    let isPointerLockEnabled = false;

    // Setup pointer lock
    const setupPointerLock = () => {
        const canvas = renderer.domElement;
        
        // Request pointer lock on click
        canvas.addEventListener('click', () => {
            if (!isPointerLockEnabled && document.pointerLockElement !== canvas) {
                canvas.requestPointerLock = canvas.requestPointerLock || 
                                          canvas.mozRequestPointerLock || 
                                          canvas.webkitRequestPointerLock;
                canvas.requestPointerLock();
            }
        });

        // Pointer lock change event handlers
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mozpointerlockchange', onPointerLockChange);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange);
    };

    const onPointerLockChange = () => {
        isPointerLockEnabled = (document.pointerLockElement === renderer.domElement);
        console.log(`Pointer lock ${isPointerLockEnabled ? 'acquired' : 'released'}`);
        if (!isPointerLockEnabled) {
            console.log('Current keys state cleared');
            // Clear all key states when losing pointer lock
            Object.keys(keysPressed).forEach(key => {
                keysPressed[key] = false;
            });
        }
    };

    // Keyboard event handlers with logging
    const onKeyDown = (e) => {
        const key = e.key.toLowerCase();
        
        // Ignore if focused on input elements
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            console.log(`Key ${key} ignored (input element focused)`);
            return;
        }
    
        console.groupCollapsed(`Key DOWN: ${key}`);
        console.log('Key pressed:', key);
        console.log('Pointer lock active:', isPointerLockEnabled);
        console.log('Current keys pressed:', Object.keys(keysPressed).filter(k => keysPressed[k]));
        
        keysPressed[key] = true;
        
        // Prevent default for control keys
        if ([' ', 'control', 'shift'].includes(key)) {
            e.preventDefault();
            console.log('Prevented default for control key');
        }
        
        // Generate projectile on 'g' key
        if (key === 'g' && isPointerLockEnabled) {
            console.log('Triggering projectile generation');
            generateProjectile();
        }
        
        console.groupEnd();
    };
    
    const onKeyUp = (e) => {
        const key = e.key.toLowerCase();
        console.groupCollapsed(`Key UP: ${key}`);
        console.log('Key released:', key);
        console.log('Current keys pressed before release:', Object.keys(keysPressed).filter(k => keysPressed[k]));
        
        keysPressed[key] = false;
        
        console.groupEnd();
    };
    
    // Movement update function with logging
    const update = (delta) => {
        if (!isPointerLockEnabled) {
            console.log('Movement update skipped - pointer lock not active');
            return;
        }
        
        // Calculate movement direction with logging
        const forward = (keysPressed['w'] ? -1 : 0) + (keysPressed['s'] ? 1 : 0);
        const right = (keysPressed['d'] ? 1 : 0) + (keysPressed['a'] ? -1 : 0);
        const up = (keysPressed[' '] ? 1 : 0) + (keysPressed['control'] ? -1 : 0);
        
        console.groupCollapsed(`Movement Update (delta: ${delta.toFixed(4)})`);
        console.log('Movement inputs:', {
            W: keysPressed['w'],
            A: keysPressed['a'],
            S: keysPressed['s'],
            D: keysPressed['d'],
            SPACE: keysPressed[' '],
            CONTROL: keysPressed['control']
        });
        console.log('Calculated directions:', { forward, right, up });
        
        // Update velocity
        velocity.set(
            right * speed * delta,
            up * altitudeSpeed * delta,
            forward * speed * delta
        );
        
        console.log('Velocity vector:', velocity.clone());
        
        // Apply movement
        if (velocity.x !== 0) {
            console.log(`Moving right by ${velocity.x.toFixed(2)}`);
            controls.moveRight(velocity.x);
        }
        if (velocity.z !== 0) {
            console.log(`Moving forward by ${velocity.z.toFixed(2)}`);
            controls.moveForward(velocity.z);
        }
        if (velocity.y !== 0) {
            console.log(`Changing altitude by ${velocity.y.toFixed(2)}`);
            camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
        }
        
        console.log('New camera position:', camera.position.clone());
        console.groupEnd();
    };

    // Projectile system
    const generateProjectile = () => {
        console.groupCollapsed('[Projectile] New projectile created');
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const projectile = new THREE.Mesh(geometry, material);
        
        // Position at camera with small forward offset
        projectile.position.copy(camera.position);
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        projectile.position.add(direction.multiplyScalar(1));
        
        scene.add(projectile);
        activeProjectiles.add(projectile);
        console.log('Projectile added to scene', {
        position: projectile.position.clone(),
        direction: direction.clone()
        });
        
        // Movement parameters
        const maxDistance = 20;
        const projectileSpeed = 0.2;
        let distanceTraveled = 0;
        
        // Auto-remove after 5 seconds
        const timeoutId = setTimeout(() => {
            console.log('Projectile timeout reached - removing');
            removeProjectile(projectile);
        }, 5000);
        
        // Animation loop
        const animateProjectile = () => {
            if (distanceTraveled >= maxDistance || !scene.children.includes(projectile)) {
                removeProjectile(projectile);
                console.log('Projectile reached max distance - removing');
                return;
            }
            
            // Move projectile
            const moveDirection = new THREE.Vector3();
            camera.getWorldDirection(moveDirection);
            projectile.position.add(moveDirection.multiplyScalar(projectileSpeed));
            distanceTraveled += projectileSpeed;
            
            // Check collisions
            if (checkCollision(projectile)) {
                removeProjectile(projectile);
                console.log('Projectile reached a target - removing');
                return;
            }
            
            requestAnimationFrame(animateProjectile);
        };
        
        animateProjectile();
        
        // Cleanup function
        const removeProjectile = (proj) => {
            console.log('Removing projectile');
            if (scene.children.includes(proj)) {
                scene.remove(proj);
            }
            activeProjectiles.delete(proj);
            clearTimeout(timeoutId);
        };
    };
    
        // Collision detection
    const checkCollision = (projectile) => {
        let hitDetected = false;
        
        scene.children.forEach(object => {
            if (object !== projectile && object.userData?.pmid && 
                projectile.position.distanceTo(object.position) < 1) {
                
                // Find the corresponding table row
                const row = document.querySelector(`tr[data-pmid="${object.userData.pmid}"]`);
                if (row) {
                    const checkbox = row.querySelector('.select-checkbox');
                    if (checkbox) {
                        // Toggle the checkbox state
                        checkbox.checked = !checkbox.checked;
                        
                        // Trigger the change event to use the existing selection logic
                        const event = new Event('change');
                        checkbox.dispatchEvent(event);
                        
                        hitDetected = true;
                    }
                }
            }
        });
        
        return hitDetected;
    };

    // Cleanup function
    const dispose = () => {
        // Remove event listeners
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        document.removeEventListener('mozpointerlockchange', onPointerLockChange);
        document.removeEventListener('webkitpointerlockchange', onPointerLockChange);
        
        // Clean up projectiles
        activeProjectiles.forEach(projectile => {
            if (scene.children.includes(projectile)) {
                scene.remove(projectile);
            }
        });
        activeProjectiles.clear();
        
        // Exit pointer lock if active
        if (isPointerLockEnabled) {
            document.exitPointerLock();
        }
    };

    // Initialize everything
    setupPointerLock();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    return { 
        controls, 
        update,
        dispose,
        _keysPressed: keysPressed,
        _isPointerLockEnabled: () => isPointerLockEnabled
    };
}
