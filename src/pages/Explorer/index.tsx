import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  const controlsRef = useRef<OrbitControls | null>(null); // Хранение ссылки на OrbitControls
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null); // Хранение ссылки на камеру


  useEffect(() => {
    const scene = new THREE.Scene();

    const parameters = {
      size: 0.1,
      starColor: '#ffffff',
      size_sun: 0.15,
      sunColor: '#ffdb4d',
      size_exo: 0.1,
      exoColor: '#b6d7a8',
    };

    let coordinatesS: { x: number; y: number; z: number; name?: string }[] = [];
    let coordinatesP: { x: number; y: number; z: number; name?: string }[] = [];

    const addSun = (scene: THREE.Scene) => {
      const sunGeometry = new THREE.SphereGeometry(parameters.size_sun, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({ color: parameters.sunColor });
      const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
      sunMesh.position.set(0, 0, 0);
      sunMesh.userData = { type: 'sun', name: 'Sun' };
      scene.add(sunMesh);
    };

    const addExo = (coordinatesP: { x: number; y: number; z: number; name: string }[], scene: THREE.Scene) => {
      const exoGeometry = new THREE.SphereGeometry(parameters.size_exo, 32, 32);
      const exoMaterial = new THREE.MeshBasicMaterial({ color: parameters.exoColor });

      coordinatesP.forEach(coord => {
        const exoMesh = new THREE.Mesh(exoGeometry, exoMaterial);
        exoMesh.position.set(coord.x, coord.y, coord.z);
        exoMesh.userData = { type: 'exo', name: coord.name };
        scene.add(exoMesh);
      });
    };

    const generateGalaxy = (coordinatesS: { x: number; y: number; z: number; name: string }[], scene: THREE.Scene) => {
      const count = coordinatesS.length;
      const positions = new Float32Array(count * 3);

      coordinatesS.forEach((coord, index) => {
        positions[index * 3] = coord.x;
        positions[index * 3 + 1] = coord.y;
        positions[index * 3 + 2] = coord.z;
      });

      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const starMaterial = new THREE.PointsMaterial({
        size: parameters.size,
        color: parameters.starColor,
      });

      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);
    };

    const loadCoordinates = () => {
      Promise.all([
        fetch('data/cart_nearby_stars.json').then(response => response.json()),
        fetch('data/cart_nearby_planets.json').then(response => response.json())
      ])
        .then(([starsData, planetsData]) => {
          const starNamesExist = starsData.name !== undefined;
          const planetNamesExist = planetsData.name !== undefined;

          coordinatesS = Object.keys(starsData.x).map((key) => ({
            x: starsData.x[key],
            y: starsData.y[key],
            z: starsData.z[key],
            name: starNamesExist ? starsData.names[key] || `Star ${key}` : `Star ${key}`,
          }));

          coordinatesP = Object.keys(planetsData.x).map((key) => ({
            x: planetsData.x[key],
            y: planetsData.y[key],
            z: planetsData.z[key],
            name: planetNamesExist ? planetsData.name[key] || `Exoplanet ${key}` : `Exoplanet ${key}`,
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

          generateGalaxy(
            coordinatesS.map(star => ({ ...star, name: star.name || `Star ${star.x}-${star.y}-${star.z}` })),
            scene
          );
          addSun(scene);
          addExo(
            coordinatesP.map(planet => ({ ...planet, name: planet.name || `Exoplanet ${planet.x}-${planet.y}-${planet.z}` })),
            scene
          );
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

    const controls = new OrbitControls(camera, canvasRef.current as HTMLCanvasElement);
    controls.enableDamping = true;
    controlsRef.current = controls; // Сохраняем ссылку на controls

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / sizes.width) * 2 - 1;
      mouse.y = -(event.clientY / sizes.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;

        if (intersectedObject.userData.type === 'exo') {
          setTooltip(`Exoplanet: ${intersectedObject.userData.name}`);
        } else if (intersectedObject.userData.type === 'sun') {
          setTooltip('Sun');
        } else {
          setTooltip(null);
        }
      } else {
        setTooltip(null);
      };
    };

    window.addEventListener('click', onClick);

    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };

    tick();

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    return () => {
      window.removeEventListener('click', onClick);
    };
  }, []);

  // Функция для установки точки обзора камеры
 const focusOnExoplanet = (x: number, y: number, z: number) => {
    const camera = cameraRef.current;
    if (controlsRef.current && camera) {
      controlsRef.current.target.set(x, y, z); // Устанавливаем цель для OrbitControls
      
      // Плавно перемещаем камеру к новой позиции с помощью gsap
      gsap.to(camera.position, {
        x: x,
        y: y,
        z: z + 10,
        duration: 1, // Длительность анимации в секундах
        onUpdate: () => controlsRef.current?.update(), // Обновляем контроллер во время анимации
      });

      // Обновляем контроллер сразу, чтобы цель была установлена правильно
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
                onClick={() => focusOnExoplanet(exo.x, exo.y, exo.z)} // Выбор экзопланеты
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

