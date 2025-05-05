// timeBasedBackground.js
import * as THREE from 'three';

export function createTimeBasedBackground(scene) {
    // Create a large sphere for the background
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Invert the sphere so textures face inward
    
    const material = new THREE.MeshBasicMaterial({
        side: THREE.BackSide
    });
    
    const backgroundSphere = new THREE.Mesh(geometry, material);
    scene.add(backgroundSphere);
    
    // Time-based color gradients
    const timeColors = {
        night: { top: 0x000000, bottom: 0x000000 },        // 00:00 - 04:00
        dawn: { top: 0x1a1a2e, bottom: 0x16213e },         // 04:00 - 06:00
        morning: { top: 0x87CEEB, bottom: 0xE0F7FA },      // 06:00 - 12:00
        afternoon: { top: 0x64b5f6, bottom: 0xbbdefb },    // 12:00 - 17:00
        dusk: { top: 0xff7e5f, bottom: 0xfeb47b },         // 17:00 - 19:00
        evening: { top: 0x0f2027, bottom: 0x203a43 }       // 19:00 - 24:00
    };
    
    function updateBackground() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const timeValue = hours + minutes / 60;
        
        let colors;
        
        if (timeValue >= 0 && timeValue < 4) {
            colors = timeColors.night;
        } else if (timeValue >= 4 && timeValue < 6) {
            // Smooth transition from night to dawn
            const t = (timeValue - 4) / 2;
            colors = {
                top: interpolateColor(timeColors.night.top, timeColors.dawn.top, t),
                bottom: interpolateColor(timeColors.night.bottom, timeColors.dawn.bottom, t)
            };
        } else if (timeValue >= 6 && timeValue < 12) {
            // Smooth transition from dawn to morning
            const t = (timeValue - 6) / 6;
            colors = {
                top: interpolateColor(timeColors.dawn.top, timeColors.morning.top, t),
                bottom: interpolateColor(timeColors.dawn.bottom, timeColors.morning.bottom, t)
            };
        } else if (timeValue >= 12 && timeValue < 17) {
            // Smooth transition from morning to afternoon
            const t = (timeValue - 12) / 5;
            colors = {
                top: interpolateColor(timeColors.morning.top, timeColors.afternoon.top, t),
                bottom: interpolateColor(timeColors.morning.bottom, timeColors.afternoon.bottom, t)
            };
        } else if (timeValue >= 17 && timeValue < 19) {
            // Smooth transition from afternoon to dusk
            const t = (timeValue - 17) / 2;
            colors = {
                top: interpolateColor(timeColors.afternoon.top, timeColors.dusk.top, t),
                bottom: interpolateColor(timeColors.afternoon.bottom, timeColors.dusk.bottom, t)
            };
        } else if (timeValue >= 19 && timeValue < 24) {
            // Smooth transition from dusk to evening
            const t = (timeValue - 19) / 5;
            colors = {
                top: interpolateColor(timeColors.dusk.top, timeColors.evening.top, t),
                bottom: interpolateColor(timeColors.dusk.bottom, timeColors.evening.bottom, t)
            };
        }
        
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
    }
    
    // Helper function to interpolate between colors
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
    
    // Update immediately and then every minute
    updateBackground();
    setInterval(updateBackground, 60000);
    
    return {
        updateBackground // Expose if you want to manually trigger updates
    };
}
