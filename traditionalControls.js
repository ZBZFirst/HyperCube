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

    // Handle pointer lock state changes
    const onPointerLockChange = () => {
        isPointerLockEnabled = (document.pointerLockElement === renderer.domElement);
    };

    // Keyboard event handlers
    const onKeyDown = (e) => {
        // Ignore if focused on input elements
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }

        keysPressed[e.key.toLowerCase()] = true;
        
        // Prevent default for control keys
        if ([' ', 'control', 'shift'].includes(e.key.toLowerCase())) {
            e.preventDefault();
        }
        
        // Generate projectile on 'g' key
        if (e.key.toLowerCase() === 'g' && isPointerLockEnabled) {
            generateProjectile();
        }
    };

    const onKeyUp = (e) => {
        keysPressed[e.key.toLowerCase()] = false;
    };

    // Movement update function
    const update = (delta) => {
        if (!isPointerLockEnabled) return;
        
        // Calculate movement direction
        const forward = (keysPressed['w'] ? -1 : 0) + (keysPressed['s'] ? 1 : 0);
        const right = (keysPressed['d'] ? 1 : 0) + (keysPressed['a'] ? -1 : 0);
        const up = (keysPressed[' '] ? 1 : 0) + (keysPressed['control'] ? -1 : 0);
        
        // Update velocity
        velocity.set(
            right * speed * delta,
            up * altitudeSpeed * delta,
            forward * speed * delta
        );
        
        // Apply movement
        controls.moveRight(velocity.x);
        controls.moveForward(velocity.z);
        camera.position.y = Math.max(0.5, camera.position.y + velocity.y);
    };

    // Projectile system
    const generateProjectile = () => {
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
        
        // Movement parameters
        const maxDistance = 20;
        const projectileSpeed = 0.2;
        let distanceTraveled = 0;
        
        // Auto-remove after 5 seconds
        const timeoutId = setTimeout(() => {
            removeProjectile(projectile);
        }, 5000);
        
        // Animation loop
        const animateProjectile = () => {
            if (distanceTraveled >= maxDistance || !scene.children.includes(projectile)) {
                removeProjectile(projectile);
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
                return;
            }
            
            requestAnimationFrame(animateProjectile);
        };
        
        animateProjectile();
        
        // Cleanup function
        const removeProjectile = (proj) => {
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
                
                // Highlight the hit cube
                const result = highlightCubeByPmid(object.userData.pmid, true, [], null);
                if (result && onSelectCallback) {
                    onSelectCallback(result.selectedCubes, result.lastSelectedCube);
                    updateTextZone(object.userData);
                    hitDetected = true;
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
        dispose
    };
}
