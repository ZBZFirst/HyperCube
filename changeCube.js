import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

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
