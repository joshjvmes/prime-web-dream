import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as THREE from 'three';

export interface RokCatFaceHandle {
  speak: (audioUrl: string) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
}

const baseNodes = [
  { id: 'forehead_top', x: 0, y: 3.5, z: 0.2, center: true },
  { id: 'forehead', x: 0, y: 1.8, z: 1.2, center: true },
  { id: 'nose_bridge', x: 0, y: 0.8, z: 1.6, center: true },
  { id: 'nose', x: 0, y: 0.0, z: 2.0, center: true },
  { id: 'mouth_top', x: 0, y: -0.6, z: 1.8, center: true },
  { id: 'chin', x: 0, y: -1.8, z: 1.4, center: true, isJaw: true },
  { id: 'jaw_front', x: 0.6, y: -1.5, z: 1.3, center: false, isJaw: true },
  { id: 'jaw_side', x: 1.5, y: -1.2, z: 0.5, center: false, isJaw: true },
  { id: 'eye_in', x: 0.8, y: 0.9, z: 1.4, center: false },
  { id: 'eye_out', x: 2.0, y: 1.2, z: 0.8, center: false },
  { id: 'eye_bottom', x: 1.2, y: 0.4, z: 1.2, center: false },
  { id: 'snout_side', x: 0.7, y: -0.2, z: 1.6, center: false },
  { id: 'cheek_top', x: 2.8, y: 0.5, z: 0.2, center: false },
  { id: 'cheek_mid', x: 2.6, y: -0.5, z: 0.0, center: false },
  { id: 'ear_base_in', x: 1.2, y: 2.8, z: 0.5, center: false },
  { id: 'ear_base_out', x: 2.8, y: 2.2, z: 0.0, center: false },
  { id: 'ear_tip', x: 3.5, y: 4.8, z: -0.5, center: false },
];

const rightConnections = [
  ['forehead_top', 'forehead'], ['forehead', 'nose_bridge'],
  ['nose_bridge', 'nose'], ['nose', 'mouth_top'],
  ['mouth_top', 'chin'],
  ['forehead_top', 'ear_base_in'], ['forehead', 'ear_base_in'], ['forehead', 'eye_in'],
  ['nose_bridge', 'eye_in'], ['nose', 'eye_in'], ['nose', 'snout_side'],
  ['mouth_top', 'snout_side'], ['chin', 'jaw_front'],
  ['eye_in', 'eye_out'], ['eye_out', 'eye_bottom'], ['eye_bottom', 'eye_in'],
  ['nose_bridge', 'eye_bottom'], ['snout_side', 'eye_bottom'],
  ['ear_base_in', 'ear_base_out'], ['ear_base_in', 'ear_tip'], ['ear_base_out', 'ear_tip'],
  ['eye_out', 'ear_base_out'], ['eye_in', 'ear_base_in'],
  ['eye_out', 'cheek_top'], ['cheek_top', 'cheek_mid'],
  ['snout_side', 'cheek_mid'], ['eye_bottom', 'cheek_top'],
  ['jaw_front', 'jaw_side'], ['jaw_side', 'cheek_mid'], ['jaw_front', 'snout_side'],
];

const rightFaces = [
  ['forehead', 'eye_in', 'ear_base_in'],
  ['eye_in', 'eye_out', 'ear_base_out'],
  ['eye_in', 'ear_base_in', 'ear_base_out'],
  ['ear_base_in', 'ear_base_out', 'ear_tip'],
  ['nose_bridge', 'eye_in', 'eye_bottom'],
  ['nose', 'snout_side', 'eye_bottom'],
  ['eye_bottom', 'eye_out', 'cheek_top'],
  ['snout_side', 'cheek_mid', 'cheek_top'],
  ['mouth_top', 'snout_side', 'jaw_front'],
  ['jaw_front', 'snout_side', 'cheek_mid'],
  ['jaw_front', 'jaw_side', 'cheek_mid'],
];

function buildGeometryData() {
  const nodes: Record<string, THREE.Vector3> = {};
  const jawNodeIds: string[] = [];

  baseNodes.forEach(node => {
    if (node.center) {
      nodes[node.id] = new THREE.Vector3(node.x, node.y, node.z);
      if (node.isJaw) jawNodeIds.push(node.id);
    } else {
      nodes[node.id + '_R'] = new THREE.Vector3(node.x, node.y, node.z);
      nodes[node.id + '_L'] = new THREE.Vector3(-node.x, node.y, node.z);
      if (node.isJaw) {
        jawNodeIds.push(node.id + '_R');
        jawNodeIds.push(node.id + '_L');
      }
    }
  });

  const connections: string[][] = [];
  rightConnections.forEach(([a, b]) => {
    const aR = nodes[a] ? a : a + '_R';
    const bR = nodes[b] ? b : b + '_R';
    connections.push([aR, bR]);
    const aL = nodes[a] ? a : a + '_L';
    const bL = nodes[b] ? b : b + '_L';
    if (aR !== aL || bR !== bL) connections.push([aL, bL]);
  });

  const faces: string[][] = [];
  rightFaces.forEach(([a, b, c]) => {
    faces.push([nodes[a] ? a : a + '_R', nodes[b] ? b : b + '_R', nodes[c] ? c : c + '_R']);
    faces.push([nodes[a] ? a : a + '_L', nodes[c] ? c : c + '_L', nodes[b] ? b : b + '_L']);
  });

  return { nodes, jawNodeIds, connections, faces };
}

function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.1, 'rgba(0,229,255,0.8)');
  g.addColorStop(0.4, 'rgba(0,229,255,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

const RokCatFace = forwardRef<RokCatFaceHandle, { className?: string }>(({ className }, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentVolumeRef = useRef(0);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    speakingRef.current = false;
    currentVolumeRef.current = 0;
  }, []);

  const speak = useCallback(async (audioUrl: string) => {
    stopSpeaking();
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;

    audio.onplay = () => { speakingRef.current = true; };
    audio.onended = () => { speakingRef.current = false; currentVolumeRef.current = 0; };
    audio.onerror = () => { speakingRef.current = false; currentVolumeRef.current = 0; };

    await audio.play();
  }, [stopSpeaking]);

  useImperativeHandle(ref, () => ({
    speak,
    stopSpeaking,
    get isSpeaking() { return speakingRef.current; },
  }), [speak, stopSpeaking]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { nodes, jawNodeIds, connections, faces } = buildGeometryData();

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040a, 0.05);

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Points
    const pointGeometry = new THREE.BufferGeometry();
    const pointPositions: number[] = [];
    const nodeKeys = Object.keys(nodes);
    const jawIndices: number[] = [];

    nodeKeys.forEach((key, index) => {
      const pos = nodes[key];
      pointPositions.push(pos.x, pos.y, pos.z);
      if (jawNodeIds.includes(key)) jawIndices.push(index);
    });

    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    const pointMaterial = new THREE.PointsMaterial({
      size: 0.5, map: createGlowTexture(), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, color: 0x88ffff,
    });
    group.add(new THREE.Points(pointGeometry, pointMaterial));

    // Lines
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    const lineJawData: { idx: number; originalY: number }[] = [];

    connections.forEach(([idA, idB]) => {
      const posA = nodes[idA], posB = nodes[idB];
      const ci = linePositions.length;
      if (jawNodeIds.includes(idA)) lineJawData.push({ idx: ci, originalY: posA.y });
      linePositions.push(posA.x, posA.y, posA.z);
      if (jawNodeIds.includes(idB)) lineJawData.push({ idx: ci + 3, originalY: posB.y });
      linePositions.push(posB.x, posB.y, posB.z);
    });

    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.LineSegments(lineGeometry, lineMaterial));

    // Faces
    const faceGeometry = new THREE.BufferGeometry();
    const facePositions: number[] = [];
    const faceJawData: { idx: number; originalY: number }[] = [];

    faces.forEach(([idA, idB, idC]) => {
      const pA = nodes[idA], pB = nodes[idB], pC = nodes[idC];
      const ci = facePositions.length;
      if (jawNodeIds.includes(idA)) faceJawData.push({ idx: ci, originalY: pA.y });
      facePositions.push(pA.x, pA.y, pA.z);
      if (jawNodeIds.includes(idB)) faceJawData.push({ idx: ci + 3, originalY: pB.y });
      facePositions.push(pB.x, pB.y, pB.z);
      if (jawNodeIds.includes(idC)) faceJawData.push({ idx: ci + 6, originalY: pC.y });
      facePositions.push(pC.x, pC.y, pC.z);
    });

    faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(facePositions, 3));
    faceGeometry.computeVertexNormals();
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, transparent: true, opacity: 0.1,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    group.add(new THREE.Mesh(faceGeometry, faceMaterial));

    // Mouse tracking
    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener('mousemove', onMouseMove);

    // Animation loop
    let animId: number;
    const dataArray = new Uint8Array(128);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      group.rotation.y += (mouseX * 0.5 - group.rotation.y) * 0.05;
      group.rotation.x += (-mouseY * 0.3 - group.rotation.x) * 0.05;
      group.position.y = Math.sin(time * 2) * 0.2;

      let targetVolume = 0;
      if (speakingRef.current && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        targetVolume = (sum / dataArray.length) / 255;
      }

      currentVolumeRef.current += (targetVolume - currentVolumeRef.current) * 0.2;
      const jawDrop = -currentVolumeRef.current * 0.6;

      // Update point positions
      const pArr = pointGeometry.attributes.position.array as Float32Array;
      jawIndices.forEach(idx => {
        pArr[idx * 3 + 1] = nodes[nodeKeys[idx]].y + jawDrop;
      });
      pointGeometry.attributes.position.needsUpdate = true;

      // Update line positions
      const lArr = lineGeometry.attributes.position.array as Float32Array;
      lineJawData.forEach(d => { lArr[d.idx + 1] = d.originalY + jawDrop; });
      lineGeometry.attributes.position.needsUpdate = true;

      // Update face positions
      const fArr = faceGeometry.attributes.position.array as Float32Array;
      faceJawData.forEach(d => { fArr[d.idx + 1] = d.originalY + jawDrop; });
      faceGeometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={`w-full h-full ${className || ''}`} />;
});

RokCatFace.displayName = 'RokCatFace';
export default RokCatFace;
