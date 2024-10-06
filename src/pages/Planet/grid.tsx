import * as THREE from 'three';
import { convertEquatorialToCartesian, convertGalacticToEquatorial } from './helpers';

export function createEquatorialGrid() {
  const grid = new THREE.Group();
  const radius = 1000;

  const circleMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.4,
  });

  for (let lat = -90; lat <= 90; lat += 15) {
    const latitude = lat;
    const raArray: number[] = [];
    const decArray: number[] = [];
    const radiusArray: number[] = [];

    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * 360;

      raArray.push(theta);
      decArray.push(latitude);
      radiusArray.push(radius);
    }

    const cartesianCoords = convertEquatorialToCartesian(raArray, decArray, radiusArray);

    const points = cartesianCoords.map(({ x, y, z }) => new THREE.Vector3(x, y, z));

    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
    grid.add(circle);
  }

  for (let lon = 0; lon < 360; lon += 15) {
    const raArray: number[] = [];
    const decArray: number[] = [];
    const radiusArray: number[] = [];

    for (let i = 0; i <= 128; i++) {
      const phi = (i / 128) * 180 - 90;

      raArray.push(lon);
      decArray.push(phi);
      radiusArray.push(radius);
    }

    const cartesianCoords = convertEquatorialToCartesian(raArray, decArray, radiusArray);

    const points = cartesianCoords.map(({ x, y, z }) => new THREE.Vector3(x, y, z));

    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
    grid.add(circle);
  }

  return grid;
}

export function createGalacticGrid() {
  const grid = new THREE.Group();
  const radius = 1000;

  const circleMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.4,
  });

  for (let lat = -75; lat <= 75; lat += 15) {
    const lArray: number[] = [];
    const bArray: number[] = [];
    const radiusArray: number[] = [];

    for (let i = 0; i <= 128; i++) {
      const theta = (i / 128) * 360;

      lArray.push(theta);
      bArray.push(lat);
      radiusArray.push(radius);
    }

    const equatorialCoords = lArray.map((l, index) => convertGalacticToEquatorial(l, bArray[index]));

    const cartesianCoords = equatorialCoords.map(({ ra, dec }, _) =>
      convertEquatorialToCartesian([ra], [dec], [radius])[0]
    );

    const points = cartesianCoords.map(({ x, y, z }) => new THREE.Vector3(x, y, z));

    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
    grid.add(circle);
  }

  for (let lon = 0; lon < 360; lon += 15) {
    const lArray: number[] = [];
    const bArray: number[] = [];
    const radiusArray: number[] = [];

    for (let i = 0; i <= 128; i++) {
      const phi = (i / 128) * 180 - 90;

      lArray.push(lon);
      bArray.push(phi);
      radiusArray.push(radius);
    }

    const equatorialCoords = lArray.map((l, index) => convertGalacticToEquatorial(l, bArray[index]));

    const cartesianCoords = equatorialCoords.map(({ ra, dec }, _) =>
      convertEquatorialToCartesian([ra], [dec], [radius])[0]
    );

    const points = cartesianCoords.map(({ x, y, z }) => new THREE.Vector3(x, y, z));

    const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const circle = new THREE.LineLoop(circleGeometry, circleMaterial);
    grid.add(circle);
  }

  return grid;
}

