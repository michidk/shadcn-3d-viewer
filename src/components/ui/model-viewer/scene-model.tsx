"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { retainModelResources } from "./model-resources";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  MeshStandardMaterial,
  MeshBasicMaterial,
  MeshNormalMaterial,
  type Mesh,
  type Group,
} from "three";
import type { GLTFLoader } from "three-stdlib";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { inspectModel, prepareAnimationBounds, type ModelInspection } from "./model-inspection";
import type { ViewerShading } from "./model-viewer-types";

export function SceneObject({
  src,
  cubes,
  shading,
  animation,
  animationPlaying,
  animationSpeed,
  animationResetToken,
  loopAnimation,
  useDraco,
  useMeshopt,
  extendLoader,
  onReady,
  onAnimations,
  onInspect,
  selectedMesh,
  onSelectMesh,
}: {
  onInspect?: (value: ModelInspection) => void;
  selectedMesh: string | null;
  onSelectMesh: (id: string | null) => void;
  src?: string;
  cubes: boolean;
  shading: ViewerShading;
  animation: string | null;
  animationPlaying: boolean;
  animationSpeed: number;
  animationResetToken: number;
  loopAnimation: boolean;
  useDraco: boolean | string;
  useMeshopt: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  onReady: () => void;
  onAnimations: (names: string[]) => void;
}) {
  const group = useRef<Group>(null);
  useEffect(() => {
    if (group.current) onInspect?.(inspectModel(group.current));
  }, [src, cubes, onInspect]);
  useEffect(() => {
    if (!src) {
      onAnimations([]);
      onReady();
    }
  }, [src, onAnimations, onReady]);
  return (
    <group
      ref={group}
      onClick={(event) => {
        event.stopPropagation();
        onSelectMesh(event.object.userData.viewerNodeId ?? null);
      }}
    >
      {src && (
        <LoadedModel
          src={src}
          shading={shading}
          animation={animation}
          animationPlaying={animationPlaying}
          animationSpeed={animationSpeed}
          animationResetToken={animationResetToken}
          loopAnimation={loopAnimation}
          useDraco={useDraco}
          useMeshopt={useMeshopt}
          extendLoader={extendLoader}
          onReady={onReady}
          onAnimations={onAnimations}
          selectedMesh={selectedMesh}
          onSelectMesh={onSelectMesh}
        />
      )}
      {cubes && (
        <>
          <mesh
            name="Cube"
            castShadow
            position={[-1.25, 0.45, 0]}
            rotation={[0, 0.25, 0.08]}
          >
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <ViewerMaterial
              shading={selectedMesh === "0/0" ? "solid" : shading}
              selected={selectedMesh === "0/0"}
              color={selectedMesh === "0/0" ? "#e9c56a" : "#b3c899"}
            />
          </mesh>
          <mesh
            name="Dodecahedron"
            castShadow
            position={[1.05, 0.55, -0.55]}
            rotation={[0, -0.35, 0]}
          >
            <dodecahedronGeometry args={[0.55, 0]} />
            <ViewerMaterial
              shading={selectedMesh === "0/1" ? "solid" : shading}
              selected={selectedMesh === "0/1"}
              color={selectedMesh === "0/1" ? "#e9c56a" : "#d19a78"}
            />
          </mesh>
          <mesh name="Sphere" castShadow position={[0.15, 0.42, 1]}>
            <sphereGeometry args={[0.42, 48, 48]} />
            <ViewerMaterial
              shading={selectedMesh === "0/2" ? "solid" : shading}
              selected={selectedMesh === "0/2"}
              color={selectedMesh === "0/2" ? "#e9c56a" : "#7fa7a7"}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

function LoadedModel({
  src,
  shading,
  animation,
  animationPlaying,
  animationSpeed,
  animationResetToken,
  loopAnimation,
  useDraco,
  useMeshopt,
  extendLoader,
  onReady,
  onAnimations,
  selectedMesh,
  onSelectMesh,
}: {
  selectedMesh: string | null;
  onSelectMesh: (id: string | null) => void;
  src: string;
  shading: ViewerShading;
  animation: string | null;
  animationPlaying: boolean;
  animationSpeed: number;
  animationResetToken: number;
  loopAnimation: boolean;
  useDraco: boolean | string;
  useMeshopt: boolean;
  extendLoader?: (loader: GLTFLoader) => void;
  onReady: () => void;
  onAnimations: (names: string[]) => void;
}) {
  const gltf = useGLTF(src, useDraco, useMeshopt, extendLoader);
  prepareAnimationBounds(gltf.scene, gltf.animations);
  const model = useMemo(() => {
    const result = clone(gltf.scene);
    result.traverse((object) => {
      if ((object as Mesh).isMesh) (object as Mesh).castShadow = true;
    });
    result.updateMatrixWorld(true);
    return result;
  }, [gltf.scene]);
  useEffect(() => retainModelResources(model), [model]);
  const invalidate = useThree((state) => state.invalidate);
  const { mixer, actions, names } = useMemo(() => {
    const mixer = new AnimationMixer(model);
    return {
      mixer,
      names: gltf.animations.map(clip => clip.name),
      actions: Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)])),
    };
  }, [gltf.animations, model]);
  useEffect(() => () => {
    mixer.stopAllAction();
  }, [mixer]);
  const activeAction = animation ? actions[animation] : undefined;
  const advancing = useRef(false);
  useFrame((_, delta) => {
    // The first demand frame may include seconds spent idle. Do not apply that
    // elapsed time to a newly resumed or restarted action.
    mixer.update(advancing.current ? delta : 0);
    advancing.current = Boolean(activeAction?.isRunning() && activeAction.getEffectiveTimeScale() !== 0);
    if (advancing.current) invalidate();
  });
  const playback = useRef({ animationPlaying, animationSpeed });
  playback.current = { animationPlaying, animationSpeed };
  useEffect(() => {
    const restore: (() => void)[] = [];
    model.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const selected = object.userData.viewerNodeId === selectedMesh;
      if (!selected && shading === "realistic") return;
      const original = mesh.material;
      const material = selected
        ? new MeshStandardMaterial({
            color: "#e9c56a",
            emissive: "#a36d15",
            emissiveIntensity: 0.35,
          })
        : shading === "normals"
          ? new MeshNormalMaterial()
          : shading === "wireframe"
            ? new MeshBasicMaterial({ color: "#34483f", wireframe: true })
            : new MeshStandardMaterial({ color: "#a7aaa5", roughness: 0.82 });
      mesh.material = material;
      restore.push(() => {
        mesh.material = original;
        material.dispose();
      });
    });
    return () => restore.forEach((reset) => reset());
  }, [model, selectedMesh, shading]);

  useEffect(() => {
    onAnimations(names);
    onReady();
  }, [gltf, names, onAnimations, onReady]);

  useEffect(() => {
    if (!activeAction) return;
    activeAction.reset();
    activeAction.clampWhenFinished = !loopAnimation;
    activeAction.setLoop(
      loopAnimation ? LoopRepeat : LoopOnce,
      loopAnimation ? Infinity : 1,
    );
    activeAction.play();
    advancing.current = false;
    invalidate();
    activeAction.paused = !playback.current.animationPlaying;
    activeAction.setEffectiveTimeScale(playback.current.animationSpeed);
    return () => {
      activeAction.stop();
    };
  }, [activeAction, animation, loopAnimation, invalidate]);

  useEffect(() => {
    if (!activeAction) return;
    activeAction.paused = !animationPlaying;
    activeAction.setEffectiveTimeScale(animationSpeed);
    advancing.current = false;
    invalidate();
  }, [activeAction, animationPlaying, animationSpeed, invalidate]);

  useEffect(() => {
    if (!activeAction || animationResetToken === 0) return;
    activeAction.reset().play();
    advancing.current = false;
    invalidate();
    activeAction.paused = !playback.current.animationPlaying;
  }, [activeAction, animationResetToken, invalidate]);

  return (
    <primitive
      object={model}
      onClick={(event: import("@react-three/fiber").ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelectMesh(event.object.userData.viewerNodeId ?? null);
      }}
    />
  );
}

function ViewerMaterial({
  shading,
  color = "#a7aaa5",
  selected = false,
}: {
  shading: ViewerShading;
  color?: string;
  selected?: boolean;
}) {
  if (shading === "normals") return <meshNormalMaterial />;
  if (shading === "wireframe")
    return <meshBasicMaterial color="#34483f" wireframe />;
  return (
    <meshStandardMaterial
      color={shading === "solid" && !selected ? "#a7aaa5" : color}
      roughness={shading === "solid" ? 0.82 : 0.68}
      metalness={0}
    />
  );
}
