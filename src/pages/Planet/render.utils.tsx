import * as THREE from 'three';

export const calculateStarPosition = (RA: number, DEC: number, radius: number = 1000) => {
  const raRad = THREE.MathUtils.degToRad(RA);
  const decRad = THREE.MathUtils.degToRad(DEC);

  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.cos(decRad) * Math.sin(raRad);
  const z = radius * Math.sin(decRad);

  return { x, y, z };
};

// Calculate the star position based on RA/DEC
export const createStar = (RA: number, DEC: number, Vmag: number, k: number = 0.5, radius: number = 1000) => {
  const { x, y, z } = calculateStarPosition(RA, DEC, radius);

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z], 3));

  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1 + (6 - Vmag) / k,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  const star = new THREE.Points(starGeometry, starMaterial);
  star.userData = { Vmag };
  return star;
};
