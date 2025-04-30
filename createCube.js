// createCube.js start
import * as THREE from 'three';

export function createCube(data, allData) {
    const positions = calculateCubePositions(data, allData);
    const geometry = new THREE.BoxGeometry(
        positions.size,
        positions.size,
        positions.size
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
    const years = [...new Set(allData.map(d => d.PubYear || 0))].sort((a, b) => a - b);
    const normalizedZ = years.indexOf(data.PubYear || 0) + 1;
    const articlesInYear = allData.filter(d => d.PubYear === data.PubYear).length;
    const articleIndex = allData.filter(d => d.PubYear === data.PubYear).indexOf(data);
    const normalizedX = articleIndex + 1;
    const baseSize = 0.8;
    const size = data.Citations ? baseSize * (1 + Math.log10(data.Citations + 1) / 5) : baseSize;
    return {
        x: normalizedX * 1.5,
        y: 0,
        z: normalizedZ * 2,
        size: size
    };
}

function getColorForYear(year) {
    if (!year) return 0x999999;
    const minYear = 1950;
    const maxYear = new Date().getFullYear();
    const normalized = year ? (year - minYear) / (maxYear - minYear) : 0;
    return new THREE.Color().lerpColors(
        new THREE.Color(0x1a2b6d),
        new THREE.Color(0xd62246),
        Math.min(1, Math.max(0, normalized))
    ).getHex();
}
// createCube.js end
