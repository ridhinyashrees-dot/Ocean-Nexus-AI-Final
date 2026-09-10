
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Ocean3DCanvas = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. 3D Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0284c7, 0.025);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 2. Underwater Lighting (Sunbeams & Caustics)
    const ambientLight = new THREE.AmbientLight(0x06b6d4, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xbae6fd, 2.5);
    sunLight.position.set(0, 20, 10);
    scene.add(sunLight);

    // 3. Realistic Animated Fish School (Swarm Engine)
    const fishGroup = new THREE.Group();
    const fishGeometry = new THREE.ConeGeometry(0.2, 0.8, 5);
    fishGeometry.rotateX(Math.PI / 2);

    const fishCount = 45;
    const fishData = [];

    for (let i = 0; i < fishCount; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0xf97316 : 0x38bdf8, // Nemo Orange & Blue Tang colors
        shininess: 100,
      });

      const fish = new THREE.Mesh(fishGeometry, material);
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 15;

      fish.position.set(x, y, z);
      fishGroup.add(fish);

      fishData.push({
        mesh: fish,
        speed: Math.random() * 0.05 + 0.02,
        offset: Math.random() * Math.PI * 2,
        baseY: y
      });
    }
    scene.add(fishGroup);

    // 4. 3D Floating Bubbles & Plankton Particles
    const particleGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.7 });
    const particleGroup = new THREE.Group();

    const particles = [];
    for (let i = 0; i < 120; i++) {
      const p = new THREE.Mesh(particleGeometry, particleMaterial);
      p.position.set((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 20);
      particleGroup.add(p);
      particles.push(p);
    }
    scene.add(particleGroup);

    // 5. Render & Animation Loop
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Fish swimming logic
      fishData.forEach((f) => {
        f.mesh.position.x += f.speed;
        f.mesh.position.y = f.baseY + Math.sin(elapsedTime * 2 + f.offset) * 0.4;
        f.mesh.rotation.z = Math.sin(elapsedTime * 3 + f.offset) * 0.15;

        // Reset positions
        if (f.mesh.position.x > 18) f.mesh.position.x = -18;
      });

      // Bubble floating up logic
      particles.forEach((p) => {
        p.position.y += 0.03;
        if (p.position.y > 12) p.position.y = -12;
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-10 pointer-events-none" />;
};

export default Ocean3DCanvas;