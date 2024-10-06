import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AdditiveBlending } from 'three';
import styles from './styles.module.sass'; // Убедитесь, что стили корректны

const Main: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Загрузка текстуры для частиц
    const textureLoader = new THREE.TextureLoader();
    const shape = textureLoader.load('/textures/1.png');

    const scene = new THREE.Scene();

    const parameters = {
      count: 60400,
      size: 0.05,
      radius: 7,
      branches: 4,
      spin: 0.845,
      randomness: 0.4,
      randomnessPower: 2,
      stars: 2500,
      starColor: '#1b3984',
      insideColor: '#ff6030',
      outsideColor: '#1b3984',
    };

    let bgStarsGeometry: THREE.BufferGeometry | null = null;
    let bgStarsMaterial: THREE.PointsMaterial | null = null;
    let bgStars: THREE.Points | null = null;

    const generateBgStars = () => {
      if (bgStars !== null) {
        if (bgStarsGeometry) bgStarsGeometry.dispose();
        if (bgStarsMaterial) bgStarsMaterial.dispose();
        scene.remove(bgStars);
      }

      bgStarsGeometry = new THREE.BufferGeometry();
      const bgStarsPositions = new Float32Array(parameters.stars * 3);

      for (let j = 0; j < parameters.stars; j++) {
        bgStarsPositions[j * 3 + 0] = (Math.random() - 0.5) * 20;
        bgStarsPositions[j * 3 + 1] = (Math.random() - 0.5) * 20;
        bgStarsPositions[j * 3 + 2] = (Math.random() - 0.5) * 20;
      }

      bgStarsGeometry.setAttribute('position', new THREE.BufferAttribute(bgStarsPositions, 3));

      bgStarsMaterial = new THREE.PointsMaterial({
        size: parameters.size,
        depthWrite: false,
        sizeAttenuation: true,
        blending: AdditiveBlending,
        color: parameters.starColor,
        transparent: true,
        alphaMap: shape,
      });

      bgStars = new THREE.Points(bgStarsGeometry, bgStarsMaterial);
      scene.add(bgStars);
    };

    generateBgStars();

    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.PointsMaterial | null = null;
    let points: THREE.Points | null = null;

    const generateGalaxy = () => {
      if (points !== null) {
        if (geometry) geometry.dispose();
        if (material) material.dispose();
        scene.remove(points);
      }

      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(parameters.count * 3);
      const colors = new Float32Array(parameters.count * 3);

      const colorInside = new THREE.Color(parameters.insideColor);
      const colorOutside = new THREE.Color(parameters.outsideColor);

      for (let i = 0; i < parameters.count; i++) {
        const x = Math.random() * parameters.radius;
        const branchAngle = (i % parameters.branches) / parameters.branches * 2 * Math.PI;
        const spinAngle = x * parameters.spin;

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1);
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1);
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1);

        positions[i * 3] = Math.sin(branchAngle + spinAngle) * x + randomX;
        positions[i * 3 + 1] = randomY;
        positions[i * 3 + 2] = Math.cos(branchAngle + spinAngle) * x + randomZ;

        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, x / parameters.radius);

        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      material = new THREE.PointsMaterial({
        size: parameters.size,
        depthWrite: false,
        sizeAttenuation: true,
        blending: AdditiveBlending,
        vertexColors: true,
        transparent: true,
        alphaMap: shape,
      });

      points = new THREE.Points(geometry, material);
      scene.add(points);
    };

    generateGalaxy();

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(3, 3, 3);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current as HTMLCanvasElement,
      alpha: true, // Позволяет сделать фон прозрачным, если нужно
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let isMounted = true; // Флаг для остановки анимации при размонтировании

    const tick = () => {
      if (!isMounted) return;

      // Вращение галактики (можете настроить скорость)
      if (points) points.rotation.y += 0.001;
      if (bgStars) bgStars.rotation.y -= 0.0005;

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };

    tick();

    // Обработчик изменения размера окна
    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // Очистка при размонтировании компонента
    return () => {
      isMounted = false; // Останавливаем анимацию

      window.removeEventListener('resize', handleResize);
      
      // Отключаем и очищаем OrbitControls
      controls.dispose();

      // Удаляем и освобождаем bgStars
      if (bgStarsGeometry) bgStarsGeometry.dispose();
      if (bgStarsMaterial) bgStarsMaterial.dispose();
      if (bgStars) scene.remove(bgStars);

      // Удаляем и освобождаем points
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (points) scene.remove(points);

      // Освобождаем текстуру
      if (shape && shape.dispose) shape.dispose();

      // Освобождаем рендерер
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        padding: '0',
        margin: '0',
        overflow: 'hidden',
      }}
    >
      {/* Канвас с Three.js галактикой */}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      {/* Карточка с кнопками поверх галактики */}
      <Card
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 1,
          maxWidth: '400px',
          background: 'rgba(0, 0, 0, 0.5)', // Полупрозрачный фон для лучшей видимости
          padding: '20px',
          borderRadius: '10px',
        }}
      >
        <CardHeader>
          <CardTitle style={{ fontSize: '48px', color: 'white' }}>
            Welcome to the Universe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link to="/explorer">
              <Button variant="destructive">
                Explore
              </Button>
            </Link>
            <Link to="/planet">
              <Button variant="secondary">
                Planet
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Main;
