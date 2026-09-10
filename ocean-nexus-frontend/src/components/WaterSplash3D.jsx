import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const WaterSplash3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 5;

    // 2. Renderer with Transparency
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // 3. Realistic 3D Deformable Water Surface Wave Geometry
    const geometry = new THREE.PlaneGeometry(12, 8, 64, 64);
    
    // Custom Shader Material for Water Ripple Refraction & Light Reflection
    const material = new THREE.MeshPhongMaterial({
      color: 0x06b6d4,
      emissive: 0x0284c7,
      specular: 0xffffff,
      shininess: 100,
      transparent: true,
      opacity: 0.85,
      wireframe: false,
      side: THREE.DoubleSide
    });

    const waterMesh = new THREE.Mesh(geometry, material);
    scene.add(waterMesh);

    // 4. Lighting for Metallic & Realistic Water Caustics Shimmer
    const ambientLight = new THREE.AmbientLight(0x0284c7, 1.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 3, 50);
    pointLight.position.set(0, 0, 8);
    scene.add(pointLight);

    // 5. 3D Water Particles Explosion (3D Droplets)
    const particleCount = 1200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 2;
      positions[i + 1] = (Math.random() - 0.5) * 2;
      positions[i + 2] = 2 + Math.random() * 2;

      // Radial splash direction towards camera lens
      velocities[i] = (Math.random() - 0.5) * 0.15;
      velocities[i + 1] = (Math.random() - 0.5) * 0.15;
      velocities[i + 2] = Math.random() * 0.25 + 0.1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. Animation Loop (Wave Physics Simulation)
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Deform Water Vertices for Dynamic 波 3D Waves
      const posAttribute = geometry.attributes.position;
      for (let i = 0; i < posAttribute.count; i++) {
        const u = posAttribute.getX(i);
        const v = posAttribute.getY(i);
        
        // Complex Sine Wave Math for Organic Fluid Dynamics
        const z = Math.sin(u * 2 + elapsedTime * 8) * 0.35 +
                  Math.cos(v * 2.5 + elapsedTime * 6) * 0.25;
        
        posAttribute.setZ(i, z);
      }
      posAttribute.needsUpdate = true;
      geometry.computeVertexNormals();

      // Explode Particles towards Camera
      const pPositions = particleGeometry.attributes.position.array;
      for (let i = 0; i < particleCount * 3; i += 3) {
        pPositions[i] += velocities[i];
        pPositions[i + 1] += velocities[i + 1];
        pPositions[i + 2] += velocities[i + 2]; // Move towards camera lens
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Camera Zoom Dive Effect
      camera.position.z -= 0.035;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-50 pointer-events-none" />;
};

export default WaterSplash3D;