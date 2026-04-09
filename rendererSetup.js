// rendererSetup.js start
import * as THREE from 'three';

export function setupRenderer(container) {
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
// rendererSetup.js end
