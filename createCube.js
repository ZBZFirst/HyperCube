// createCube.js start
import * as THREE from 'three';

export function createCube(data, allData) {
    const size = calculateSizeBasedOnCitations(data.Citations);
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Get color scheme based on publication year
    const baseColor = getColorForYear(data.PubYear);
    
    // Create materials with different tints and metadata
    const materials = [
        createFaceMaterial(baseColor, data.PubYear, 'Year'),    // Right
        createFaceMaterial(lighten(baseColor, 0.2), data.Journal?.substr(0,3), 'Journal'), // Left
        createFaceMaterial(darken(baseColor, 0.2), data.Rating || '?', 'Rating'),  // Top
        createFaceMaterial(complement(baseColor), data.Tags?.split(',')[0] || '', 'Tag'), // Bottom
        createFaceMaterial(lighten(baseColor, 0.1), data.Author_1?.split(' ')[0], 'Author'), // Front
        createFaceMaterial(darken(baseColor, 0.1), data.Citations || '0', 'Citations') // Back
    ];
    
    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(...calculatePosition(data, allData));
    cube.userData = data;
    return cube;
}

// Helper functions
function lighten(color, amount) {
    return color.clone().lerp(new THREE.Color(0xffffff), amount);
}

function darken(color, amount) {
    return color.clone().lerp(new THREE.Color(0x000000), amount);
}

function complement(color) {
    return new THREE.Color().setHSL(
        (color.getHSL().h + 0.5) % 1,
        color.getHSL().s,
        color.getHSL().l
    );
}

function createFaceMaterial(color, text) {
    // Create a canvas for texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with color
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    context.font = 'Bold 120px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    context.fillText(text, canvas.width/2, canvas.height/2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.9
    });
}


// createCube.js end
