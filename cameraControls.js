import { setupTraditionalControls } from './traditionalControls.js';
import { setupExperimentalControls } from './experimentalControls.js';

export function setupCameraControls(camera, renderer, { useExperimental = false } = {}) {
    try {
        if (useExperimental) {
            // First try experimental controls
            return setupExperimentalControls(camera, renderer);
        }
    } catch (e) {
        console.warn("Experimental controls failed, falling back to traditional:", e);
    }
    
    // Fall back to traditional controls
    return setupTraditionalControls(camera, renderer);
}
