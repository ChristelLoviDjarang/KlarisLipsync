// Impor dependensi yang diperlukan dari React dan library lainnya
import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFBX } from "@react-three/drei";
import { useControls } from "leva";
import * as THREE from "three";
import { useSpring, animated } from "@react-spring/three";

// Mendefinisikan pemetaan untuk nilai viseme (bentuk mulut)
const corresponding = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

// Mendefinisikan komponen Avatar
export function Avatar(props) {
  // Menggunakan kontrol Leva untuk mengelola pemutaran dan pemilihan skrip
  const { playAudio, script } = useControls({
    playAudio: true,
    script: {
      value: "greeting",
      options: ["greeting", "encouragement"],
    },
  });

  // Membuat objek audio untuk skrip yang dipilih
  const audio = useMemo(() => {
    return new Audio(`/audios/${script}.ogg`);
  }, [script]);

  // Memuat dan mengurai data lipsync untuk skrip yang dipilih
  const jsonFile = useLoader(THREE.FileLoader, `/audios/${script}.json`);
  const lipsync = JSON.parse(jsonFile);

  // Membuat referensi untuk grup model 3D
  const group = useRef();
  // Memuat model 3D (file GLB)
  const { nodes, materials } = useGLTF("/models/66de6b33bb9d79984d437c2f.glb");

  // Memuat file animasi
  const { animations: standardAnimations } = useFBX("/animations/Standard.fbx");
  const { animations: talkingAnimations } = useFBX("/animations/Talking.fbx");
  const { animations: wavingAnimations } = useFBX("/animations/Waving.fbx");

  // Mengganti nama animasi untuk referensi yang lebih mudah
  if (standardAnimations.length > 0) {
    standardAnimations[0].name = "Standard";
  }
  if (talkingAnimations.length > 0) {
    talkingAnimations[0].name = "Talking";
  }
  if (wavingAnimations.length > 0) {
    wavingAnimations[0].name = "Waving";
  }

  // State untuk animasi saat ini dan visibilitas
  const [animation, setAnimation] = useState("Standard");
  const [isVisible, setIsVisible] = useState(false);

  // Membuat animasi spring untuk posisi avatar
  const spring = useSpring({
    position: isVisible ? [0, 0, 0] : [0, -1, 0],
    config: { mass: 1, tension: 280, friction: 60 },
  });

  // Menyiapkan aksi animasi
  const { actions } = useAnimations(
    [...talkingAnimations, ...wavingAnimations, ...standardAnimations],
    group
  );

  // Efek untuk menangani perubahan animasi
  useEffect(() => {
    if (actions && actions[animation]) {
      actions[animation].reset().fadeIn(0.0).play();
      return () => {
        if (actions[animation]) {
          actions[animation].fadeOut(0.5);
        }
      };
    }
  }, [animation, actions]);

  // Fungsi update frame untuk sinkronisasi bibir
  useFrame(() => {
    const currentAudioTime = audio.currentTime;

    // Mengatur ulang semua pengaruh target morph
    Object.values(corresponding).forEach((value) => {
      if (nodes.Wolf3D_Head.morphTargetDictionary[value] !== undefined) {
        nodes.Wolf3D_Head.morphTargetInfluences[
          nodes.Wolf3D_Head.morphTargetDictionary[value]
        ] = 0;
      }
      if (nodes.Wolf3D_Teeth.morphTargetDictionary[value] !== undefined) {
        nodes.Wolf3D_Teeth.morphTargetInfluences[
          nodes.Wolf3D_Teeth.morphTargetDictionary[value]
        ] = 0;
      }
    });

    // Menerapkan target morph lipsync berdasarkan waktu audio saat ini
    for (let i = 0; i < lipsync.mouthCues.length; i++) {
      const mouthCues = lipsync.mouthCues[i];
      if (
        currentAudioTime >= mouthCues.start &&
        currentAudioTime <= mouthCues.end
      ) {
        const viseme = corresponding[mouthCues.value];
        if (nodes.Wolf3D_Head.morphTargetDictionary[viseme] !== undefined) {
          nodes.Wolf3D_Head.morphTargetInfluences[
            nodes.Wolf3D_Head.morphTargetDictionary[viseme]
          ] = 0.5;
        }
        if (nodes.Wolf3D_Teeth.morphTargetDictionary[viseme] !== undefined) {
          nodes.Wolf3D_Teeth.morphTargetInfluences[
            nodes.Wolf3D_Teeth.morphTargetDictionary[viseme]
          ] = 0.5;
        }
        break;
      }
    }

    // Mengatur animasi karakter ke "Standard" ketika audio dijeda atau berakhir
    if (audio.paused || audio.ended) {
      setAnimation("Standard");
    }
  });

  // Efek untuk menangani pemutaran audio dan animasi
  useEffect(() => {
    const handleCanPlayThrough = () => {
      if (playAudio) {
        setIsVisible(true);
        audio
          .play()
          .then(() => {
            setAnimation("Talking");
          })
          .catch((err) => console.error("Pemutaran audio gagal", err));
      } else {
        setAnimation("Standard");
      }
    };

    audio.addEventListener("canplaythrough", handleCanPlayThrough);

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.pause();
      audio.currentTime = 0;
      setIsVisible(false);
    };
  }, [playAudio, audio, script]);

  // Merender model 3D dengan animasi dan target morph
  return (
    <animated.group
      ref={group}
      scale={[1, 1, 1]}
      position={spring.position}
      {...props}
      dispose={null}
    >
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
    </animated.group>
  );
}

// Pramuat model 3D untuk meningkatkan kinerja
useGLTF.preload("/models/66de6b33bb9d79984d437c2f.glb");
