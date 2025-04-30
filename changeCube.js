// changeCube.js start
import * as THREE from 'three';

export function applyPropertiesToCube(cube, properties) {
    if (properties.color) {
        try {
            cube.material.color.set(properties.color);
        } catch {
            console.warn("Invalid color. Reverting to default.");
            cube.material.color.set(0xcccccc);
        }
    }
    cube.userData = properties;
}
    // changeCube.js end
