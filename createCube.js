    // createCube.js start
import * as THREE from 'three';

export function createCube(data, allData) {
    // Calculate normalized positions
    const positions = calculateCubePositions(data, allData);
    
    const geometry = new THREE.BoxGeometry(
        positions.size,  // Width (X)
        positions.size,  // Height (Y)
        positions.size   // Depth (Z)
    );
    
    const material = new THREE.MeshPhongMaterial({
        color: getColorForYear(data.PubYear),
        transparent: true,
        opacity: 0.9
    });
    
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(positions.x, positions.y, positions.z);
    cube.userData = data;
    
    return cube;
}

function calculateCubePositions(data, allData) {
    // Get all unique years and sort them
    const years = [...new Set(allData.map(d => d.PubYear || 0))].sort((a, b) => a - b);
    
    // Normalize year to Z position (oldest = 1, newest = max)
    const normalizedZ = years.indexOf(data.PubYear || 0) + 1;
    
    // Count articles in this year for X position
    const articlesInYear = allData.filter(d => d.PubYear === data.PubYear).length;
    const articleIndex = allData.filter(d => d.PubYear === data.PubYear).indexOf(data);
    const normalizedX = articleIndex + 1;
    
    // Calculate size based on some property (e.g., citation count if available)
    const baseSize = 0.8;
    const size = data.Citations ? baseSize * (1 + Math.log10(data.Citations + 1) / 5) : baseSize;
    
    return {
        x: normalizedX * 1.5,  // Space cubes out along X
        y: 0,                  // All on ground level for now
        z: normalizedZ * 2,    // Space years out along Z
        size: size
    };
}

function getColorForYear(year) {
    if (!year) return 0x999999; // Gray for missing years
    
    // Create a color gradient from blue (old) to red (new)
    const minYear = 1950; // Adjust based on your data
    const maxYear = new Date().getFullYear();
    const normalized = year ? (year - minYear) / (maxYear - minYear) : 0;
    
    return new THREE.Color().lerpColors(
        new THREE.Color(0x1a2b6d),  // Dark blue
        new THREE.Color(0xd62246),  // Red
        Math.min(1, Math.max(0, normalized))
    ).getHex();
}
    // createCube.js end
