// timeBasedBackground.js
import * as THREE from 'three';

export function createTimeBasedBackground(scene) {
    console.log('[Background] Initializing time-based background system');
    
    // Create background sphere
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    const backgroundSphere = new THREE.Mesh(geometry, material);
    scene.add(backgroundSphere);
    console.log('[Background] Created background sphere');

    // Time-based color gradients
    const timeColors = {
        night: { name: "Midnight", top: 0x000000, bottom: 0x000000 },
        dawn: { name: "Dawn", top: 0x1a1a2e, bottom: 0x16213e },
        morning: { name: "Morning", top: 0x87CEEB, bottom: 0xE0F7FA },
        afternoon: { name: "Afternoon", top: 0x64b5f6, bottom: 0xbbdefb },
        dusk: { name: "Sunset", top: 0xff7e5f, bottom: 0xfeb47b },
        evening: { name: "Evening", top: 0x0f2027, bottom: 0x203a43 }
    };

    let currentPhase = '';
    
    function updateBackground() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeValue = hours + minutes / 60;
        
        console.group(`[Background] Updating (${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')})`);
        
        let phase, colors;
        
        if (timeValue >= 0 && timeValue < 4) {
            phase = 'night';
        } else if (timeValue < 6) {
            phase = 'dawn';
        } else if (timeValue < 12) {
            phase = 'morning';
        } else if (timeValue < 17) {
            phase = 'afternoon';
        } else if (timeValue < 19) {
            phase = 'dusk';
        } else {
            phase = 'evening';
        }

        // Only log phase changes
        if (phase !== currentPhase) {
            console.log(`[Background] Phase changed to: ${timeColors[phase].name}`);
            currentPhase = phase;
        }

        colors = timeColors[phase];
        console.log(`Using colors: Top=${colors.top.toString(16)}, Bottom=${colors.bottom.toString(16)}`);

        // Create gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `#${colors.top.toString(16).padStart(6, '0')}`);
        gradient.addColorStop(1, `#${colors.bottom.toString(16).padStart(6, '0')}`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, canvas.height);
        
        const texture = new THREE.CanvasTexture(canvas);
        backgroundSphere.material.map = texture;
        backgroundSphere.material.needsUpdate = true;
        
        console.log('Created new gradient texture');
        console.groupEnd();

        // Detailed status every 5 minutes
        if (minutes % 5 === 0) {
            console.log(`[Background Status] 
                Time: ${hours}:${String(minutes).padStart(2, '0')}
                Phase: ${timeColors[phase].name}
                Colors: Top=#${colors.top.toString(16)}, Bottom=#${colors.bottom.toString(16)}
                Texture Size: ${canvas.width}x${canvas.height}
                Material Updated: ${backgroundSphere.material.needsUpdate}
            `);
        }
    }

    function interpolateColor(color1, color2, factor) {
        const r1 = (color1 >> 16) & 255;
        const g1 = (color1 >> 8) & 255;
        const b1 = color1 & 255;
        
        const r2 = (color2 >> 16) & 255;
        const g2 = (color2 >> 8) & 255;
        const b2 = color2 & 255;
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return (r << 16) | (g << 8) | b;
    }

    // Initial update
    updateBackground();
    
    // Update every minute (60000ms)
    const updateInterval = setInterval(updateBackground, 60000);
    console.log(`[Background] Set update interval to every 60 seconds (ID: ${updateInterval})`);

    return {
        updateBackground,
        stopUpdates: () => {
            clearInterval(updateInterval);
            console.log('[Background] Stopped automatic updates');
        }
    };
}
