import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import styles from './styles.module.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import gsap from 'gsap';

const Explorer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exoplanets, setExoplanets] = useState<{ x: number; y: number; z: number; name: string }[]>([]);
  const [filteredExoplanets, setFilteredExoplanets] = useState<{ x: number; y: number; z: number; name: string }[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const controlsRef = useRef<OrbitControls | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const starColors = [
    new THREE.Color(0.5, 0.5, 1), // Blue
    new THREE.Color(1, 0.5, 0.5), // Red
    new THREE.Color(1, 1, 1),     // Green
  ];

  const vertexShader = `
    attribute float size;
    attribute float Vmag;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vVmag;
    varying float vSize;

    void main() {
      vColor = color;
      vVmag = Vmag;
      vSize = size;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (100.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const starFragmentShader = `
    varying vec3 vColor;
    varying float vVmag;
    varying float vSize;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv) * 2.0;
      float intensity = 1.0 - smoothstep(0.0, 1.0, d);

      float baseLuminosity = 0.5;

      float luminosity = vVmag < 0.0 ? 3.0 - vVmag : 1.0 / (vVmag + 1.0);
      luminosity = max(luminosity, baseLuminosity);

      float glow1 = smoothstep(0.4, 0.8, vSize * intensity);
      float glow2 = smoothstep(0.3, 0.6, vSize * intensity) * 0.5;

      float totalGlow = glow1 + glow2;

      float brightnessThreshold = 2.0;
      totalGlow = min(totalGlow, brightnessThreshold);

      vec3 col = vColor * totalGlow * luminosity * 3.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const planetFragmentShader = `
    varying float vSize;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv) * 2.0;
      float intensity = 1.0 - smoothstep(0.0, 1.0, d);

      float glow1 = smoothstep(0.4, 0.8, vSize * intensity);
      float glow2 = smoothstep(0.3, 0.6, vSize * intensity) * 0.5;
      float glow3 = smoothstep(0.2, 0.4, vSize * intensity) * 0.3;

      float totalGlow = glow1 + glow2 + glow3;

      float brightnessThreshold = 2.0;
      totalGlow = min(totalGlow, brightnessThreshold);

      vec3 col = vec3(0.0, 1.0, 0.0) * totalGlow;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  useEffect(() => {
    const scene = new THREE.Scene;

    let coordinatesS: { x: number; y: number; z: number; Vmag: number }[] = [];
    let coordinatesP: { x: number; y: number; z: number; name: string }[] = [];
    let starMaterial: THREE.ShaderMaterial;

    const generateStars = (coordinatesS: { x: number; y: number; z: number; Vmag: number }[], scene: THREE.Scene) => {
      const starData = coordinatesS.map((coord) => ({
        x: coord.x,
        y: coord.y,
        z: coord.z,
        Vmag: coord.Vmag,
        size: 1,
        color: starColors[Math.floor(Math.random() * starColors.length)]
      }));

      const starPositions = new Float32Array(starData.length * 3);
      const starSizes = new Float32Array(starData.length);
      const starVmagArray = new Float32Array(starData.length);
      const starColorsArray = new Float32Array(starData.length * 3);

      starData.forEach((star, i) => {
        starPositions[i * 3] = star.x;
        starPositions[i * 3 + 1] = star.y;
        starPositions[i * 3 + 2] = star.z;
        starSizes[i] = star.size;
        starVmagArray[i] = star.Vmag;
        starColorsArray[i * 3] = star.color.r;
        starColorsArray[i * 3 + 1] = star.color.g;
        starColorsArray[i * 3 + 2] = star.color.b;
      });

      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
      starGeometry.setAttribute('Vmag', new THREE.BufferAttribute(starVmagArray, 1));
      starGeometry.setAttribute('color', new THREE.BufferAttribute(starColorsArray, 3));

      starMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: starFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const stars = new THREE.Points(starGeometry, starMaterial);
      stars.renderOrder = 1;
      scene.add(stars);
    };

    const generatePlanets = (coordinatesP: { x: number; y: number; z: number; name: string }[], scene: THREE.Scene) => {
      const planetData = coordinatesP.map((coord) => ({
        x: coord.x,
        y: coord.y,
        z: coord.z,
        name: coord.name,
        size: 2 + Math.random() * 3,
      }));

      const planetPositions = new Float32Array((planetData.length + 1) * 3);
      const planetSizes = new Float32Array(planetData.length + 1);

      planetData.forEach((planet, i) => {
        planetPositions[i * 3] = planet.x;
        planetPositions[i * 3 + 1] = planet.y;
        planetPositions[i * 3 + 2] = planet.z;
        planetSizes[i] = planet.size;
      });

      const planetGeometry = new THREE.BufferGeometry();
      planetGeometry.setAttribute('position', new THREE.BufferAttribute(planetPositions, 3));
      planetGeometry.setAttribute('size', new THREE.BufferAttribute(planetSizes, 1));

      const planetMaterial = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: planetFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const planets = new THREE.Points(planetGeometry, planetMaterial);
      planets.renderOrder = 2;
      scene.add(planets);

      return planetData;
    };

    const loadCoordinates = () => {
      Promise.all([
        fetch('data/near_stars_revised_crop.json').then(response => response.json()),
        fetch('data/cart_nearby_planets.json').then(response => response.json())
      ])
        .then(([starsData, planetsData]) => {
          coordinatesS = Object.keys(starsData.x).map((key) => ({
            x: starsData.x[key],
            y: starsData.y[key],
            z: starsData.z[key],
            Vmag: starsData.Vmag?.[key] || 0,
          }));

          coordinatesP = Object.keys(planetsData.x).map((key) => ({
            x: planetsData.x[key],
            y: planetsData.y[key],
            z: planetsData.z[key],
            name: planetsData.name?.[key] || `Exoplanet ${key}`,
          }));

          setExoplanets(
            coordinatesP.map(planet => ({
              ...planet,
              name: planet.name || `Exoplanet ${planet.x}-${planet.y}-${planet.z}`
            }))
          );
          setFilteredExoplanets(
            coordinatesP.map(planet => ({
              ...planet,
              name: planet.name || `Exoplanet ${planet.x}-${planet.y}-${planet.z}`
            }))
          );

          generateStars(coordinatesS, scene);
          generatePlanets(coordinatesP, scene);
        })
        .catch(error => {
          console.error('Failed to load JSON:', error);
        });
    };

    loadCoordinates();

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(1, 1, 1);
    scene.add(camera);
    cameraRef.current = camera;



    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current as HTMLCanvasElement,
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    const controls = new OrbitControls(camera, canvasRef.current as HTMLCanvasElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const onMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.userData.name) {
          setTooltip(`Object: ${intersectedObject.userData.name}`);
        }
      } else {
        setTooltip(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);

    const tick = () => {
      controls.update();
      composer.render();
      requestAnimationFrame(tick);
    };

    tick();

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      composer.setSize(sizes.width, sizes.height);
    });

  }, []);

  const focusOnExoplanet = (x: number, y: number, z: number) => {
    if (controlsRef.current) {
      controlsRef.current.target.set(x, y, z);
      controlsRef.current.update();

 const focusOnExoplanet = (x: number, y: number, z: number) => {
    const camera = cameraRef.current;
    if (controlsRef.current && camera) {
      controlsRef.current.target.set(x, y, z);

      gsap.to(camera.position, {
        x: x,
        y: y,
        z: z + 10,
        duration: 1,
        onUpdate: () => controlsRef.current?.update(), // Обновляем контроллер во время анимации
      });

      controlsRef.current.update();
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = exoplanets.filter(exo =>
      exo.name.toLowerCase().includes(query)
    );
    setFilteredExoplanets(filtered);
  };

  return (
    <div className={styles.container}>
      {!isMenuOpen && (
        <Button onClick={() => setIsMenuOpen(true)} className={styles.toggleButton}>
          ☰ Open Menu
        </Button>
      )}

      {isMenuOpen && (
        <div className={styles.menu}>
          <div className={styles.searchContainer}>
            <Input
              type="text"
              placeholder="Search Exoplanet..."
              value={searchQuery}
              onChange={handleSearch}
              className={styles.searchInput}
            />
            <Button onClick={() => setIsMenuOpen(false)} variant="secondary" className={styles.closeButton}>
              ✕
            </Button>
          </div>
          <ul className={styles.exoList}>
            {filteredExoplanets.map((exo) => (
              <li
                key={`${exo.x}-${exo.y}-${exo.z}`}
                className={styles.exoItem}
                onClick={() => focusOnExoplanet(exo.x, exo.y, exo.z)}
              >
                {exo.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <canvas ref={canvasRef} className={styles.webgl}></canvas>
      {tooltip && <div className={styles.tooltip}>{tooltip}</div>}
    </div>
  );
};

export default Explorer;

