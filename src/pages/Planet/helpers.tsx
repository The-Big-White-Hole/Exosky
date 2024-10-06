import * as THREE from 'three';

export function convertEquatorialToCartesian(raArray: number[], decArray: number[], R: number[] = []): { x: number; y: number; z: number }[] {
  const cartesianCoords: { x: number; y: number; z: number }[] = [];

  const radiusArray = R.length > 0 ? R : Array(raArray.length).fill(1);

  for (let i = 0; i < raArray.length; i++) {
    const RA = raArray[i];
    const DEC = decArray[i];
    const radius = radiusArray[i];

    const raRad = THREE.MathUtils.degToRad(RA);
    const decRad = THREE.MathUtils.degToRad(DEC);

    const x = radius * Math.cos(decRad) * Math.cos(raRad);
    const y = radius * Math.cos(decRad) * Math.sin(raRad);
    const z = radius * Math.sin(decRad);

    cartesianCoords.push({ x, y, z });
  }

  return cartesianCoords;
}

export function convertEquatorialToGalactic(ra: number, dec: number): { l: number, b: number } {
    const degToRad = THREE.MathUtils.degToRad;
    const radToDeg = THREE.MathUtils.radToDeg;

    const raRad = degToRad(ra);
    const decRad = degToRad(dec);

    const alphaGP = degToRad(192.25);
    const deltaGP = degToRad(27.4);
    const lNCP = degToRad(123);

    const sinB = Math.sin(decRad) * Math.sin(deltaGP) +
                 Math.cos(decRad) * Math.cos(deltaGP) * Math.cos(raRad - alphaGP);

    const b = Math.asin(sinB);

    const y = Math.cos(decRad) * Math.sin(raRad - alphaGP);
    const x = Math.sin(decRad) * Math.cos(deltaGP) -
              Math.cos(decRad) * Math.sin(deltaGP) * Math.cos(raRad - alphaGP);

    const l = Math.atan2(y, x) + lNCP;

    return {
        l: (radToDeg(l) + 360) % 360,
        b: radToDeg(b)
    };
}

export function convertGalacticToEquatorial(l: number, b: number): { ra: number, dec: number } {
    const degToRad = THREE.MathUtils.degToRad;
    const radToDeg = THREE.MathUtils.radToDeg;

    const lRad = degToRad(l);
    const bRad = degToRad(b);

    const alphaGP = degToRad(192.85);
    const deltaGP = degToRad(27.13);
    const lNCP = degToRad(122.93);

    const sinDec = Math.sin(deltaGP) * Math.sin(bRad) +
                   Math.cos(deltaGP) * Math.cos(bRad) * Math.cos(lNCP - lRad);
    const dec = Math.asin(sinDec);

    const cosDec = Math.cos(dec);

    const sinDeltaRA = Math.cos(bRad) * Math.sin(lNCP - lRad) / cosDec;

    const cosDeltaRA = (Math.cos(deltaGP) * Math.sin(bRad) -
                        Math.sin(deltaGP) * Math.cos(bRad) * Math.cos(lNCP - lRad)) / cosDec;

    const deltaRA = Math.atan2(sinDeltaRA, cosDeltaRA);

    const ra = (alphaGP + deltaRA + 2 * Math.PI) % (2 * Math.PI);

    return {
        ra: radToDeg(ra),
        dec: radToDeg(dec)
    };
}
