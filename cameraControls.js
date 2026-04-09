import { setupTraditionalControls } from './traditionalControls.js';
import { setupExperimentalControls } from './experimentalControls.js';

export function setupCameraControls(camera, renderer, { useExperimental = false } = {}) {
    let activeControlType = 'traditional'; // Default fallback
    let controlsObject = null;

    if (useExperimental) {
        const experimentalResult = attemptExperimentalControls(camera, renderer);
        if (experimentalResult.success) {
            activeControlType = 'experimental';
            controlsObject = experimentalResult.controls;
            console.log(`%cCONTROLS: Using experimental control scheme`, "color: #4CAF50; font-weight: bold");
        } else {
            console.log(`%cCONTROLS: Falling back to traditional because: ${experimentalResult.reason}`, "color: #FF9800; font-weight: bold");
        }
    } else {
        console.log(`%cCONTROLS: Using traditional controls by configuration`, "color: #2196F3; font-weight: bold");
    }

    // Fallback to traditional if experimental failed or wasn't attempted
    if (!controlsObject) {
        controlsObject = setupTraditionalControls(camera, renderer);
    }

    // Return enhanced controls object with tracking
    return {
        ...controlsObject,
        getActiveControlType: () => activeControlType,
        // Forward any existing getControlMode if present
        getControlMode: controlsObject.getControlMode || (() => activeControlType)
    };
}

function attemptExperimentalControls(camera, renderer) {
    try {
        // Check for basic mobile features first
        if (!isLikelyMobileDevice()) {
            return {
                success: false,
                reason: "Device doesn't appear to be mobile/touch capable",
                controls: null
            };
        }

        // Try initializing experimental controls
        const controls = setupExperimentalControls(camera, renderer);
        
        // Verify controls are working (if the implementation supports verification)
        if (controls && typeof controls.update === 'function') {
            return {
                success: true,
                reason: "",
                controls: controls
            };
        }
        
        return {
            success: false,
            reason: "Experimental controls initialized but didn't return valid controls object",
            controls: null
        };
    } catch (e) {
        return {
            success: false,
            reason: `Experimental controls threw an error: ${e.message}`,
            controls: null
        };
    }
}

function isLikelyMobileDevice() {
    // Check multiple indicators of mobile/touch capability
    return (
        // Touch events
        ('ontouchstart' in window || 
         navigator.maxTouchPoints > 0 || 
         navigator.msMaxTouchPoints > 0) &&
        // Small screen (but not too small - could be hybrid device)
        window.innerWidth <= 1024 &&
        window.innerWidth >= 320 &&
        // Mobile user agent (not perfect but helpful)
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
}
