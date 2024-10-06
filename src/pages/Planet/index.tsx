import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Options } from './options';
import styles from './styles.module.css';
import { createGalacticGrid, createEquatorialGrid } from './grid';
import { Button } from '@/components/ui/button';

const DEFAULT_LINE_MATERIAL = new THREE.LineDashedMaterial( {
	color: 0x4deeea,
	linewidth: 1,
	scale: 1,
	dashSize: 3,
	gapSize: 1,
} );


export function PlanetView() {
  const mountRef = useRef<HTMLDivElement>(null);
  const scene = useRef(new THREE.Scene());
  const camera = useRef(
    new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
  );

  // conttrolling the drawing mode
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const initialLinePoint = useRef<THREE.Vector3 | null>(null);

  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const composer = useRef<EffectComposer | null>(null);
  const raycaster = useRef(new THREE.Raycaster());

  // INCREASING ACCURACUY OF RAYCASTER
  raycaster.current.params.Points.threshold = 5;
  const mouse = useRef(new THREE.Vector2());

  const isDragging = useRef(false);
  const isRightMouseButtonPressed = useRef(false); // Новый реф для ПКМ
  const prevMousePosition = useRef({ x: 0, y: 0 });

  const [hoveredStar, setHoveredStar] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [clickedStar, setClickedStar] = useState<string | null>(null);

  const [equatorialGrid, setEquatorialGrid] = useState<THREE.Group | null>(null);
  const [galacticGrid, setGalacticGrid] = useState<THREE.Group | null>(null);

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

  const fragmentShader = `
    varying vec3 vColor;
    varying float vVmag;
    varying float vSize;

    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv) * 2.0;
      float intensity = 1.0 - smoothstep(0.0, 1.0, d);

      float baseLuminosity = 0.5;

      // If Vmag is negative, increase the luminosity
      float luminosity = vVmag < 0.0 ? 3.0 - vVmag : 1.0 / (vVmag + 1.0);
      luminosity = max(luminosity, baseLuminosity); // Minimal luminosity

      // Multi layer glow for better results
      float glow1 = smoothstep(0.4, 0.8, vSize * intensity);
      float glow2 = smoothstep(0.3, 0.6, vSize * intensity) * 0.5;
      float glow3 = smoothstep(0.2, 0.4, vSize * intensity) * 0.3;

      float totalGlow = glow1 + glow2 + glow3;

      float brightnessThreshold = 2.0;
      totalGlow = min(totalGlow, brightnessThreshold);

      vec3 col = vColor * totalGlow * luminosity * 3.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  useEffect(() => {
    if (!mountRef.current) return;

    renderer.current = new THREE.WebGLRenderer({ antialias: true });
    renderer.current.setClearColor(0x000000, 1);
    renderer.current.setSize(window.innerWidth, window.innerHeight);
    renderer.current.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.current.domElement);

    camera.current.position.set(0, 0, 0);

    const renderScene = new RenderPass(scene.current, camera.current);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.7,
      0.5,
      0.85
    );
    composer.current = new EffectComposer(renderer.current);
    composer.current.addPass(renderScene);
    composer.current.addPass(bloomPass);

    const animate = () => {
      requestAnimationFrame(animate);
      composer.current?.render();
    };

    animate();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('wheel', onWheelZoom);
    mountRef.current.addEventListener('mousedown', onMouseDown);
    mountRef.current.addEventListener('mouseup', onMouseUp);
    mountRef.current.addEventListener('mousemove', onMouseMove);
    mountRef.current.addEventListener('click', onStarClick);

    window.addEventListener('click', onWindowClick); // Новый обработчик для закрытия тултипа

    loadJSONData();

    return () => {
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('wheel', onWheelZoom);
      window.removeEventListener('click', onWindowClick); // Убираем обработчик

      if (mountRef.current) {
        mountRef.current.removeEventListener('mousedown', onMouseDown);
        mountRef.current.removeEventListener('mouseup', onMouseUp);
        mountRef.current.removeEventListener('mousemove', onMouseMove);
        mountRef.current.removeEventListener('click', onStarClick);
      }

      if (renderer.current && mountRef.current) {
        mountRef.current.removeChild(renderer.current.domElement);
      }
    };
  }, []);

  const onStarClick = () => {
    const intersects = raycaster.current.intersectObjects(scene.current.children, true)
      .filter((intersect: THREE.Intersection<THREE.Object3D>): intersect is THREE.Intersection<THREE.Points> => {
        return intersect.object instanceof THREE.Points;
      });

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const starIndex = intersection.index!;
      console.log(isDrawingMode)
      // if the mode is drawing!
      if (!isDrawingMode){
        const starVmag = intersection.object.geometry.getAttribute('Vmag').getX(starIndex);
        if (starVmag !== undefined) {
          setClickedStar(`Clicked on star: Vmag ${starVmag}`);
        } else {
          clearClickedStar();
        }
      } else {

        // creating an initial point from the intrersected object
        const starCoordsX = intersection.object.geometry.getAttribute("position").getX(starIndex);
        const starCoordsY = intersection.object.geometry.getAttribute("position").getY(starIndex);
        const starCoordsZ = intersection.object.geometry.getAttribute("position").getZ(starIndex);
        const starPoint = new THREE.Vector3(starCoordsX, starCoordsY, starCoordsZ);


        // drawing line if it is already locked, or just lokcing the first point
        if (initialLinePoint.current) {
          const lineGeometry = new THREE.BufferGeometry().setFromPoints([initialLinePoint.current, starPoint]);
          const newLine =  new THREE.Line( lineGeometry , DEFAULT_LINE_MATERIAL);
          scene.current.add(newLine);
          initialLinePoint.current = starPoint
        }
        else {
          initialLinePoint.current = starPoint;
        }

      }
    }
  };

  const clearClickedStar = () => {
    setClickedStar(null);
  };

  const onWindowClick = (event: MouseEvent) => {
    const targetElement = event.target as Element;
    if (clickedStar && targetElement && !targetElement.closest(`.${styles.tooltip}`)) {
      clearClickedStar();
    }
  };

  const onWheelZoom = (event: WheelEvent) => {
    const zoomSpeed = 0.1;
    camera.current.fov += event.deltaY * zoomSpeed;
    camera.current.fov = THREE.MathUtils.clamp(camera.current.fov, 20, 100);
    camera.current.updateProjectionMatrix();
  };

  const onWindowResize = () => {
    camera.current.aspect = window.innerWidth / window.innerHeight;
    camera.current.updateProjectionMatrix();
    if (renderer.current) {
      renderer.current.setSize(window.innerWidth, window.innerHeight);
    }
    composer.current?.setSize(window.innerWidth, window.innerHeight);
  };

  const onMouseDown = (event: MouseEvent) => {
    if (event.button === 2) {
      isRightMouseButtonPressed.current = true;
    } else {
      isDragging.current = true;
    }
    prevMousePosition.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const onMouseUp = () => {
    isDragging.current = false;
    isRightMouseButtonPressed.current = false;
  };

  const onMouseMove = (event: MouseEvent) => {
    if (isDragging.current) {
      const deltaMove = {
        x: event.clientX - prevMousePosition.current.x,
        y: event.clientY - prevMousePosition.current.y,
      };

      const rotationSpeed = 0.005;

      camera.current.rotation.y -= deltaMove.x * rotationSpeed;
      camera.current.rotation.x -= deltaMove.y * rotationSpeed;

      prevMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    if (isRightMouseButtonPressed.current) {
      const deltaMove = {
        x: event.clientX - prevMousePosition.current.x,
        y: event.clientY - prevMousePosition.current.y,
      };

      const moveSpeed = 0.5;
      camera.current.position.x -= deltaMove.x * moveSpeed;
      camera.current.position.y += deltaMove.y * moveSpeed;

      prevMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera.current);
    const intersects = raycaster.current.intersectObjects(scene.current.children, true)
      .filter((intersect: THREE.Intersection<THREE.Object3D>): intersect is THREE.Intersection<THREE.Points> => {
        return intersect.object instanceof THREE.Points;
      });

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const starIndex = intersection.index!;
      const starVmag = intersection.object.geometry.getAttribute('Vmag').getX(starIndex);
      if (starVmag !== undefined) {
        setHoveredStar(`Vmag: ${starVmag}`);
        setTooltipPosition({ top: event.clientY, left: event.clientX });
      }
    } else {
      setHoveredStar(null);
    }
  };

  const loadJSONData = async () => {
    const response = await fetch('data/earth_stars.json');
    const rawData = await response.json();

    const starData = convertDataToArray(rawData);

    const totalStars = starData.length;
    const starPositions = new Float32Array(totalStars * 3);
    const starSizes = new Float32Array(totalStars);
    const starVmagArray = new Float32Array(totalStars);
    const starColors = new Float32Array(totalStars * 3);

    const k = 0.05;
    const colorInside = new THREE.Color('#ff6030');
    const colorOutside = new THREE.Color('#1b3984');

    starData.forEach(({ RA, DEC, Vmag }: { RA: number; DEC: number; Vmag: number }, i: number) => {
      const radius = 1000;
      const raRad = THREE.MathUtils.degToRad(RA);
      const decRad = THREE.MathUtils.degToRad(DEC);

      const x = radius * Math.cos(decRad) * Math.cos(raRad);
      const y = radius * Math.cos(decRad) * Math.sin(raRad);
      const z = radius * Math.sin(decRad);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const calculatedSize = 0.8 + (6 - Vmag) / k;
      starSizes[i] = calculatedSize;
      starVmagArray[i] = Vmag;

      const mixedColor = colorInside.clone().lerp(colorOutside, Vmag / 6);
      starColors[i * 3] = mixedColor.r;
      starColors[i * 3 + 1] = mixedColor.g;
      starColors[i * 3 + 2] = mixedColor.b;
    });

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('Vmag', new THREE.BufferAttribute(starVmagArray, 1));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.renderOrder = 1;
    scene.current.add(stars);
  };

  const convertDataToArray = (rawData: { RA: Record<string, number>; DEC: Record<string, number>; Vmag: Record<string, number> }) => {
    const result: { RA: number; DEC: number; Vmag: number }[] = [];
    const totalStars = Object.keys(rawData.RA).length;

    for (let i = 0; i < totalStars; i++) {
      result.push({
        RA: rawData.RA[i],
        DEC: rawData.DEC[i],
        Vmag: rawData.Vmag[i],
      });
    }

    return result;
  };

  const toggleDrawingMode = (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log(event);
    if (isDrawingMode) {
      console.log("WRITTEN A LOA D OF SHIT");
      setIsDrawingMode(false);
    } else {
      console.log("POEHALI :PPPPP")
      setIsDrawingMode(true);
    }
    
  };

  const toggleEquatorial = (isVisible: boolean) => {
    if (!equatorialGrid && isVisible) {
      const grid = createEquatorialGrid();
      grid.raycast = () => { };
      setEquatorialGrid(grid);
      scene.current.add(grid);
    } else if (equatorialGrid) {
      if (isVisible) {
        scene.current.add(equatorialGrid);
      } else {
        scene.current.remove(equatorialGrid);
      }
    }
  };

  const toggleGalactic = (isVisible: boolean) => {
    if (!galacticGrid && isVisible) {
      const grid = createGalacticGrid();
      grid.raycast = () => { };
      setGalacticGrid(grid);
      scene.current.add(grid);
    } else if (galacticGrid) {
      if (isVisible) {
        scene.current.add(galacticGrid);
      } else {
        scene.current.remove(galacticGrid);
      }
    }
  };

  return (
    <div>
      <div ref={mountRef} className={styles.canvasContainer} />
      <Options toggleEquatorial={toggleEquatorial} toggleGalactic={toggleGalactic}/>
      <Button variant={isDrawingMode? "destructive" : null} onClick={toggleDrawingMode}>{isDrawingMode? "OBSERVER MODE" : "DRAWING MODE"}</Button>
      {hoveredStar && (
        <div className={styles.tooltip} style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px` }}>
          {hoveredStar}
        </div>
      )}
      {clickedStar && (
        <div className={styles.tooltip} style={{ top: `${tooltipPosition.top + 20}px`, left: `${tooltipPosition.left}px`, position: 'absolute', background: 'rgba(255, 255, 255, 0.8)', padding: '5px', borderRadius: '5px' }}>
          <span>{clickedStar}</span>
          <button onClick={clearClickedStar} style={{ marginLeft: '10px', cursor: 'pointer', fontSize: '12px', padding: '2px 4px', background: 'transparent', border: 'none', color: 'red' }}>✖</button>
        </div>
      )}
    </div>
  );
}

export default PlanetView;

