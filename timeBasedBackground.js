import * as THREE from 'three';

export function createDynamicBackground(scene) {
    console.log('[Background] Creating dynamic cube background');

    // 1. Create a cube that will resize to fit content
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        color: 0x000000,
        transparent: false
    });

    const backgroundCube = new THREE.Mesh(geometry, material);
    backgroundCube.name = 'DynamicBackgroundCube';
    backgroundCube.renderOrder = -1000; // Render first
    scene.add(backgroundCube);

    // 2. Store reference to content bounds
    let contentBounds = {
        min: new THREE.Vector3(-10, -10, -10), // Default small size
        max: new THREE.Vector3(10, 10, 10)
    };

    // 3. Update function that resizes cube to contain all content
    function updateSize(contentMin, contentMax) {
        // Calculate required size (content bounds + 50 unit padding)
        const padding = 50;
        const size = new THREE.Vector3().subVectors(contentMax, contentMin);
        
        // Set cube dimensions
        backgroundCube.scale.x = Math.max(1, size.x + padding * 2);
        backgroundCube.scale.y = Math.max(1, size.y + padding * 2);
        backgroundCube.scale.z = Math.max(1, size.z + padding * 2);
        
        // Center the cube around content
        backgroundCube.position.copy(contentMin.clone().add(contentMax).multiplyScalar(0.5));
        
        console.log(`[Background] Resized to: ${backgroundCube.scale.x}x${backgroundCube.scale.y}x${backgroundCube.scale.z}`);
    }

    // 4. Time-based color updates (simplified)
    const timeColors = [
        { name: "Night", color: 0x000000 },    // 00:00-06:00
        { name: "Morning", color: 0x87CEEB },  // 06:00-12:00
        { name: "Day", color: 0x64b5f6 },      // 12:00-18:00
        { name: "Evening", color: 0x0f2027 }   // 18:00-24:00
    ];

    function updateTimeColors() {
        const hours = new Date().getHours();
        const period = Math.floor(hours / 6);
        const colors = timeColors[period % timeColors.length];
        
        material.color.setHex(colors.color);
        console.log(`[Background] Updated to ${colors.name} colors`);
    }

    // 5. Initial setup
    updateTimeColors();
    updateSize(contentBounds.min, contentBounds.max);
    
    // Update colors every hour
    const colorInterval = setInterval(updateTimeColors, 3600000);

    return {
        updateSize, // Call this when your content bounds change
        dispose: () => {
            clearInterval(colorInterval);
            scene.remove(backgroundCube);
            geometry.dispose();
            material.dispose();
        }
    };
}
