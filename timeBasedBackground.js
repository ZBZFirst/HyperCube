import * as THREE from 'three';

export function createTimeBasedBackground(scene) {
    console.log('[Background] Initializing optimized time-based background');

    // 1. Create a simpler background geometry
    const geometry = new THREE.SphereGeometry(1000, 32, 32);
    geometry.scale(-1, 1, 1); // Invert the sphere

    // 2. Pre-create canvas for better performance
    const canvas = document.createElement('canvas');
    canvas.width = 2; // Minimal width for gradient
    canvas.height = 128; // Reduced height
    const ctx = canvas.getContext('2d');
    
    // 3. Create material with initial black color
    const material = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        transparent: false,
        map: new THREE.CanvasTexture(canvas)
    });
    
    const backgroundSphere = new THREE.Mesh(geometry, material);
    backgroundSphere.name = 'TimeBackground';
    backgroundSphere.renderOrder = -1000; // Ensure it renders first
    scene.add(backgroundSphere);

    // 4. Optimized color definitions
    const timeColors = [
        { // 00:00 - 04:00 (Night)
            name: "Night",
            top: 0x000000,
            bottom: 0x000000
        },
        { // 04:00 - 06:00 (Dawn)
            name: "Dawn", 
            top: 0x1a1a2e,
            bottom: 0x16213e
        },
        { // 06:00 - 12:00 (Morning)
            name: "Morning",
            top: 0x87CEEB,
            bottom: 0xE0F7FA
        },
        { // 12:00 - 17:00 (Afternoon)
            name: "Afternoon",
            top: 0x64b5f6,
            bottom: 0xbbdefb
        },
        { // 17:00 - 19:00 (Dusk)
            name: "Dusk",
            top: 0xff7e5f,
            bottom: 0xfeb47b
        },
        { // 19:00 - 24:00 (Evening)
            name: "Evening",
            top: 0x0f2027,
            bottom: 0x203a43
        }
    ];

    // 5. Optimized update function
    function updateBackground() {
        const now = new Date();
        const hours = now.getHours();
        const phaseIndex = Math.floor(hours / 4);
        const colors = timeColors[phaseIndex % timeColors.length];

        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `#${colors.top.toString(16).padStart(6, '0')}`);
        gradient.addColorStop(1, `#${colors.bottom.toString(16).padStart(6, '0')}`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update texture
        material.map.needsUpdate = true;
        
        console.log(`[Background] Updated to ${colors.name} mode`);
    }

    // 6. Initial update
    updateBackground();

    // 7. Update every 15 minutes instead of every minute
    const updateInterval = setInterval(updateBackground, 900000);
    
    return {
        updateBackground,
        dispose: () => {
            clearInterval(updateInterval);
            scene.remove(backgroundSphere);
            material.dispose();
            geometry.dispose();
        }
    };
}
