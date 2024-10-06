import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './styles.module.css';

const GalaxyApp: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [tooltip, setTooltip] = useState<string | null>(null);

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

        let coordinatesS: { x: number; y: number; z: number }[] = [];
        let coordinatesP: { x: number; y: number; z: number }[] = [];

        const addSun = (scene: THREE.Scene) => {
            const sunGeometry = new THREE.SphereGeometry(parameters.size_sun, 32, 32);
            const sunMaterial = new THREE.MeshBasicMaterial({ color: parameters.sunColor });
            const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
            sunMesh.position.set(0, 0, 0);
            sunMesh.userData = { type: 'sun'}
            scene.add(sunMesh);
        };

        const addExo = (coordinatesP: { x: number; y: number; z: number }[], scene: THREE.Scene) => {
            const exoGeometry = new THREE.SphereGeometry(parameters.size_exo, 32, 32);
            const exoMaterial = new THREE.MeshBasicMaterial({ color: parameters.exoColor });

            coordinatesP.forEach(coord => {
                const exoMesh = new THREE.Mesh(exoGeometry, exoMaterial);
                exoMesh.position.set(coord.x, coord.y, coord.z);
                exoMesh.userData = { type: 'exo' };
                scene.add(exoMesh);
            });
        };

        const generateGalaxy = (coordinatesS: { x: number; y: number; z: number }[], scene: THREE.Scene) => {
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
                    coordinatesS = Object.keys(starsData.x).map((key) => ({
                        x: starsData.x[key],
                        y: starsData.y[key],
                        z: starsData.z[key],
                    }));

                    coordinatesP = Object.keys(planetsData.x).map((key) => ({
                        x: planetsData.x[key],
                        y: planetsData.y[key],
                        z: planetsData.z[key],
                    }));

                    generateGalaxy(coordinatesS, scene);
                    addSun(scene);
                    addExo(coordinatesP, scene);
                })
                .catch(error => {
                    console.error('Ошибка при загрузке файлов JSON:', error);
                });
        };

        loadCoordinates();

        const sizes = { width: window.innerWidth, height: window.innerHeight };
        const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
        camera.position.set(1, 1, 1);
        scene.add(camera);

        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current as HTMLCanvasElement,
        });
        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const controls = new OrbitControls(camera, canvasRef.current as HTMLCanvasElement);
        controls.enableDamping = true;

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
                    setTooltip('Exoplanet');
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

    return (
        <div className={styles.container}>
            <canvas ref={canvasRef} className={styles.webgl}></canvas>
            {tooltip && <div className={styles.tooltip}>{tooltip}</div>}
        </div>
    );
};

export default GalaxyApp;

