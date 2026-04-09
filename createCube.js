import * as THREE from 'three';

// Configuration - map these to your actual data columns
const DATA_MAPPING = {
    YEAR: 'PubYear',          // Publication year
    JOURNAL: 'Source',       // Journal name
    PMID: 'PMID',            // PubMed ID
    TAG: 'Keyword_1',        // First keyword
    AUTHOR: 'Author_1',      // First author
    TITLE: 'Title'           // Article title
};

export const GeometryScaleModes = {
    NONE: 'none',
    AUTHOR_COUNT: 'author_count',
    MESH_COUNT: 'mesh_count'
};

let currentGeometryScaleMode = GeometryScaleModes.NONE;

export function setGeometryScaleMode(mode) {
    if (Object.values(GeometryScaleModes).includes(mode)) {
        currentGeometryScaleMode = mode;
    } else {
        console.warn(`[GeometryScale] Unknown mode "${mode}", keeping "${currentGeometryScaleMode}"`);
    }
}

export function getGeometryScaleMode() {
    return currentGeometryScaleMode;
}

export function createCube(data, allData) {
    const width = 0.8;
    const depth = 0.8;
    const height = getGeometryHeight(data);
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const baseColor = getColorForYear(getField(data, DATA_MAPPING.YEAR));

    // Create materials for each face with proper fallbacks
    const materials = [
        createFaceMaterial( // Year face
            baseColor,
            getField(data, DATA_MAPPING.YEAR, 'Year?'),
            'Year'
        ),
        createFaceMaterial( // Journal face
            lightenColor(baseColor, 0.2),
            getJournalAbbreviation(getField(data, DATA_MAPPING.JOURNAL)),
            'Journal'
        ),
        createFaceMaterial( // PMID face
            darkenColor(baseColor, 0.2),
            getField(data, DATA_MAPPING.PMID, 'PMID?'),
            'ID'
        ),
        createFaceMaterial( // Keyword face
            complementColor(baseColor),
            getFirstTag(getField(data, DATA_MAPPING.TAG)),
            'Keyword'
        ),
        createFaceMaterial( // Author face
            lightenColor(baseColor, 0.1),
            getFirstAuthorInitial(getField(data, DATA_MAPPING.AUTHOR)),
            'Author'
        ),
        createFaceMaterial( // Title face
            darkenColor(baseColor, 0.1),
            getTitleAbbreviation(getField(data, DATA_MAPPING.TITLE)),
            'Title'
        )
    ];

    normalizeFaceTextureAspect(materials, width, height, depth);

    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(...calculatePosition(data, allData));
    cube.userData = data;
    cube.userData.geometryHeight = height;
    cube.userData.geometryScaleMode = currentGeometryScaleMode;
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

// Helper function to calculate position
function calculatePosition(data, allData) {
    const index = allData.indexOf(data);
    const gridSize = Math.ceil(Math.sqrt(allData.length));
    const x = (index % gridSize) * 2 - gridSize;
    const z = Math.floor(index / gridSize) * 2 - gridSize;
    return [x, 0, z];
}

function getGeometryHeight(data) {
    switch (currentGeometryScaleMode) {
        case GeometryScaleModes.AUTHOR_COUNT: {
            const authorCount = countFilledSeries(data, 'Author_', 20);
            return Math.max(1, authorCount);
        }
        case GeometryScaleModes.MESH_COUNT: {
            const meshCount = countFilledSeries(data, 'MeSH_', 30);
            return Math.max(1, meshCount);
        }
        case GeometryScaleModes.NONE:
        default:
            return 0.8;
    }
}

function countFilledSeries(data, prefix, maxIndex) {
    let count = 0;
    for (let i = 1; i <= maxIndex; i++) {
        const value = data?.[`${prefix}${i}`];
        if (value && String(value).trim() !== '') {
            count++;
        }
    }
    return count;
}

function createFaceMaterial(color, text, label) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill with color
    context.fillStyle = `#${color.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add main text (centered, larger)
    context.font = 'Bold 60px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = 'white';
    
    // Split long text into two lines if needed
    if (String(text).length > 8) {
        const mid = Math.floor(String(text).length / 2);
        context.fillText(String(text).substring(0, mid), canvas.width/2, canvas.height/2 - 20);
        context.fillText(String(text).substring(mid), canvas.width/2, canvas.height/2 + 20);
    } else {
        context.fillText(String(text), canvas.width/2, canvas.height/2);
    }
    
    // Add label (smaller, at bottom)
    context.font = '20px Arial';
    context.fillText(label, canvas.width/2, canvas.height - 20);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        shininess: 30,
        emissive: 0x000000, 
        emissiveIntensity: 0 
    });
}

function normalizeFaceTextureAspect(materials, width, height, depth) {
    if (!Array.isArray(materials)) return;

    const safeAdjust = (material, faceWidth, faceHeight) => {
        const texture = material?.map;
        if (!texture) return;

        const ratio = faceWidth / Math.max(faceHeight, 0.0001);
        const repeatY = Math.min(1, ratio);
        const repeatX = Math.min(1, 1 / Math.max(ratio, 0.0001));

        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.center.set(0.5, 0.5);
        texture.repeat.set(repeatX, repeatY);
        texture.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);
        texture.needsUpdate = true;
    };

    // BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z
    // ±X faces: depth x height
    safeAdjust(materials[0], depth, height);
    safeAdjust(materials[1], depth, height);
    // ±Y faces: width x depth
    safeAdjust(materials[2], width, depth);
    safeAdjust(materials[3], width, depth);
    // ±Z faces: width x height
    safeAdjust(materials[4], width, height);
    safeAdjust(materials[5], width, height);
}

// Color manipulation helpers (unchanged)
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
    // Better abbreviation that keeps journal recognizable
    return journal.split(' ')
        .map(word => word.length > 3 ? word.substring(0,3) : word)
        .join(' ')
        .substring(0, 12);
}

function getFirstTag(tag) {
    if (!tag) return '';
    return tag.length > 10 ? tag.substring(0,10) + '...' : tag;
}

function getFirstAuthorInitial(author) {
    if (!author) return '?';
    const parts = author.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[parts.length-1][0]}` : parts[0][0];
}

function getTitleAbbreviation(title) {
    if (!title) return 'No Title';
    // Get first meaningful word (skip articles)
    const firstWord = title.replace(/^(the|a|an)\s+/i, '').split(' ')[0];
    return firstWord.length > 8 ? firstWord.substring(0,8) : firstWord;
}

// Year-based coloring (unchanged)
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
