// createCube.js start
import * as THREE from 'three';

// Configuration - map these to your actual data columns
const DATA_MAPPING = {
    YEAR: 'PubYear',          // Publication year
    JOURNAL: 'Journal',       // Journal name
    RATING: 'Rating',         // User rating (if available)
    TAGS: 'Tags',            // Tags/comma-separated
    AUTHOR: 'Author_1',       // First author
    CITATIONS: 'Citations',   // Citation count
    TITLE: 'Title'           // Article title
};

export function createCube(data, allData) {
    // Safely get size with fallback
    const size = calculateSizeBasedOnCitations(getField(data, DATA_MAPPING.CITATIONS));
    
    const geometry = new THREE.BoxGeometry(size, size, size);
    const baseColor = getColorForYear(getField(data, DATA_MAPPING.YEAR));

    // Create materials for each face with proper fallbacks
    const materials = [
        createFaceMaterial(
            baseColor,
            getField(data, DATA_MAPPING.YEAR, 'Year?'),
            'Year'
        ),
        createFaceMaterial(
            lightenColor(baseColor, 0.2),
            getJournalAbbreviation(getField(data, DATA_MAPPING.JOURNAL)),
            'Journal'
        ),
        createFaceMaterial(
            darkenColor(baseColor, 0.2),
            getField(data, DATA_MAPPING.RATING, '?'),
            'Rating'
        ),
        createFaceMaterial(
            complementColor(baseColor),
            getFirstTag(getField(data, DATA_MAPPING.TAGS)),
            'Tag'
        ),
        createFaceMaterial(
            lightenColor(baseColor, 0.1),
            getFirstAuthorInitial(getField(data, DATA_MAPPING.AUTHOR)),
            'Author'
        ),
        createFaceMaterial(
            darkenColor(baseColor, 0.1),
            getField(data, DATA_MAPPING.CITATIONS, '0'),
            'Citations'
        )
    ];

    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(...calculatePosition(data, allData));
    cube.userData = data;
    return cube;
}

// Safe field access with fallback
function getField(data, fieldName, fallback = '') {
    if (!data) return fallback;
    if (fieldName in data) {
        const value = data[fieldName];
        return value !== undefined && value !== null ? value : fallback;
    }
    return fallback;
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
