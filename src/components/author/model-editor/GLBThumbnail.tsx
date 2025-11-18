// src/components/author/model-editor/GLBThumbnail.tsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

type GLBThumbnailProps = {
  url?: string;
  size?: number;
};

export default function GLBThumbnail({ url, size = 160 }: GLBThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;

    const canvas = canvasRef.current;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const w = size;
    const h = Math.round(size * 0.75);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(DPR);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 1000);

    const loader = new GLTFLoader();
    loader.setCrossOrigin("anonymous");

    let model: THREE.Object3D | null = null;
    let frameId: number;

    loader.load(
      url,
      (gltf) => {
        model = gltf.scene || (gltf as any);
        if (!model) return;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const sizeBox = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeBox.x, sizeBox.y, sizeBox.z) || 1;

        const scale = (1 / maxDim) * 1.5;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));

        scene.add(model);

        const fov = (camera.fov * Math.PI) / 180;
        const radius = maxDim * scale * 0.5;
        const dist = radius / Math.sin(fov / 2);

        camera.position.set(0, radius * 1.2, dist * 1.2);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      },
      undefined,
      (error) => {
        console.error("Lỗi load GLB thumbnail:", error, "URL:", url);
      }
    );

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (model) {
        model.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      renderer.dispose();
      const gl =
        canvas.getContext("webgl2") || canvas.getContext("webgl") || undefined;
      (gl as any)?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={Math.round(size * 0.75)}
      className="w-full h-full block"
    />
  );
}
