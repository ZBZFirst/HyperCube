// createCube.js start
import * as THREE from 'three';

export function createCube(data, allData) {
    const size = calculateSizeBasedOnCitations(data.Citations);
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Get color scheme based on publication year
    const baseColor = getColorForYear(data.PubYear);
    
    // Create materials for each face
    const materials = [
        createFaceMaterial(baseColor, data.PubYear, 'Year'),    // Right
        createFaceMaterial(lightenColor(baseColor, 0.2), getJournalAbbreviation(data.Journal), 'Journal'), // Left
        createFaceMaterial(darkenColor(baseColor, 0.2), data.Rating || '?', 'Rating'),  // Top
        createFaceMaterial(complementColor(baseColor), getFirstTag(data.Tags), 'Tag'), // Bottom
        createFaceMaterial(lightenColor(baseColor, 0.1), getFirstAuthorInitial(data.Author_1), 'Author'), // Front
        createFaceMaterial(darkenColor(baseColor, 0.1), data.Citations || '0', 'Citations') // Back
    ];
    
    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(...calculatePosition(data, allData));
    cube.userData = data;
    return cube;
}

// Helper function to calculate cube size based on citations
function calculateSizeBasedOnCitations(citationCount) {
    const baseSize = 0.8;
    if (!citationCount) return baseSize;
    return baseSize * (1 + Math.log10(citationCount + 1) / 5);
}

// Helper function to calculate position
function calculatePosition(data, allData) {
    // Implement your positioning logic here
    // Example: simple grid layout
    const index = allData.indexOf(data);
    const gridSize = Math.ceil(Math.sqrt(allData.length));
    const x = (index % gridSize) * 2 - gridSize;
    const z = Math.floor(index / gridSize) * 2 - gridSize;
    return [x, 0, z];
}

// Helper function to create face material with text
function createFaceMaterial(color, text, label) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with color
    context.fillStyle = `#${color.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    context.font = 'Bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    context.fillText(text, canvas.width/2, canvas.height/2);
    
    // Add small label
    context.font = '20px Arial';
    context.fillText(label, canvas.width/2, canvas.height/2 + 60);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        shininess: 30
    });
}

// Color manipulation helpers
function lightenColor(color, amount) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l += (1 - hsl.l) * amount;
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
}

function darkenColor(color, amount) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l -= hsl.l * amount;
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
}

function complementColor(color) {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + 0.5) % 1;
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
}

// Data formatting helpers
function getJournalAbbreviation(journal) {
    if (!journal) return 'N/A';
    return journal.split(' ').map(word => word[0]).join('').toUpperCase().substring(0,3);
}

function getFirstTag(tags) {
    if (!tags) return '';
    return tags.split(',')[0].substring(0,3);
}

function getFirstAuthorInitial(author) {
    if (!author) return '?';
    return author.split(' ')[0][0];
}

// Year-based coloring
function getColorForYear(year) {
    if (!year) return new THREE.Color(0x999999);
    const minYear = 1950;
    const maxYear = new Date().getFullYear();
    const normalized = (year - minYear) / (maxYear - minYear);
    return new THREE.Color().lerpColors(
        new THREE.Color(0x1a2b6d),
        new THREE.Color(0xd62246),
        Math.min(1, Math.max(0, normalized))
    );
}


// createCube.js end
