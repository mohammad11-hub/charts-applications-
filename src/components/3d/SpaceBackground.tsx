import { Canvas } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import { Particles } from "./Particles";

export const SpaceBackground = () => {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <color attach="background" args={["#0a0e1a"]} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00D9FF" />
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={4} 
          saturation={0.5}
          fade 
          speed={1}
        />
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Particles />
        </Float>
      </Canvas>
    </div>
  );
};
