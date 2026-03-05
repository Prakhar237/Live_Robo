import React, { useRef, useEffect, useMemo } from 'react';
import { AppState, Emotion } from '../types';

interface RobotFaceProps {
  state: AppState;
  emotion: Emotion;
  width?: number;
  height?: number;
}

// Cozmo-style eye paths (normalized to 100x100 viewbox)
const EYE_PATHS = {
  [Emotion.NEUTRAL]: "M 10,20 Q 10,10 20,10 L 80,10 Q 90,10 90,20 L 90,80 Q 90,90 80,90 L 20,90 Q 10,90 10,80 Z",
  [Emotion.HAPPY]: "M 10,50 Q 10,40 20,30 Q 50,0 80,30 Q 90,40 90,50 L 90,80 Q 90,90 80,90 L 20,90 Q 10,90 10,80 Z", // Arch
  [Emotion.SAD]: "M 10,20 Q 10,10 20,10 L 80,10 Q 90,10 90,20 L 90,50 Q 90,60 80,70 Q 50,100 20,70 Q 10,60 10,50 Z", // U-shape (inverted arch)
  [Emotion.ANGRY]: "M 10,35 L 50,15 L 90,35 L 90,80 Q 90,90 80,90 L 20,90 Q 10,90 10,80 Z", // Angled top
  [Emotion.SURPRISED]: "M 15,25 Q 15,15 25,15 L 75,15 Q 85,15 85,25 L 85,75 Q 85,85 75,85 L 25,85 Q 15,85 15,75 Z", // Smaller, wider open
  [Emotion.CONFUSED]: "M 10,25 L 90,15 L 90,85 L 10,75 Z", // Tilted rect
  [Emotion.THINKING]: "M 10,20 Q 10,10 20,10 L 80,10 Q 90,10 90,20 L 90,80 Q 90,90 80,90 L 20,90 Q 10,90 10,80 Z",
};

const RobotFace: React.FC<RobotFaceProps> = ({ state, emotion, width = 800, height = 480 }) => {
  // Refs for direct DOM manipulation (performance)
  const leftEyeRef = useRef<SVGPathElement>(null);
  const rightEyeRef = useRef<SVGPathElement>(null);
  const leftPupilRef = useRef<SVGRectElement>(null);
  const rightPupilRef = useRef<SVGRectElement>(null);
  const containerRef = useRef<SVGSVGElement>(null);
  
  // Animation state
  const animState = useRef({
    blinkTimer: 0,
    blinkDuration: 0,
    isBlinking: false,
    pupilX: 0,
    pupilY: 0,
    targetPupilX: 0,
    targetPupilY: 0,
    lastFrameTime: 0,
    currentPath: EYE_PATHS[Emotion.NEUTRAL],
    targetPath: EYE_PATHS[Emotion.NEUTRAL],
  });

  // Update target path when emotion changes
  useEffect(() => {
    animState.current.targetPath = EYE_PATHS[emotion] || EYE_PATHS[Emotion.NEUTRAL];
  }, [emotion]);

  useEffect(() => {
    let animationFrameId: number;

    const render = (time: number) => {
      const deltaTime = time - animState.current.lastFrameTime;
      animState.current.lastFrameTime = time;

      // --- Logic ---

      // 1. Blinking
      if (state !== AppState.ERROR) {
        if (!animState.current.isBlinking) {
          animState.current.blinkTimer -= deltaTime;
          if (animState.current.blinkTimer <= 0) {
            animState.current.isBlinking = true;
            animState.current.blinkDuration = 150 + Math.random() * 100;
          }
        } else {
          animState.current.blinkDuration -= deltaTime;
          if (animState.current.blinkDuration <= 0) {
            animState.current.isBlinking = false;
            animState.current.blinkTimer = 2000 + Math.random() * 4000;
          }
        }
      }

      // 2. Gaze / Jitter
      // Randomly move eyes slightly to feel alive
      if (Math.random() < 0.02) {
        const range = state === AppState.LISTENING ? 5 : 2;
        animState.current.targetPupilX = (Math.random() - 0.5) * range;
        animState.current.targetPupilY = (Math.random() - 0.5) * range;
      }
      // Return to center
      if (Math.random() < 0.01) {
        animState.current.targetPupilX = 0;
        animState.current.targetPupilY = 0;
      }

      // Smooth interpolation for gaze
      const lerp = 0.1;
      animState.current.pupilX += (animState.current.targetPupilX - animState.current.pupilX) * lerp;
      animState.current.pupilY += (animState.current.targetPupilY - animState.current.pupilY) * lerp;

      // --- Rendering ---

      // Calculate Blink Scale (Y-axis squeeze)
      let scaleY = 1;
      if (animState.current.isBlinking) {
        // Simple sine wave for blink
        const progress = Math.max(0, animState.current.blinkDuration / 200); // approx duration
        scaleY = Math.min(1, Math.abs(Math.sin(progress * Math.PI)) * 0.1); // Close to 0.1 height
      }

      // Apply transforms
      // We need to preserve the centering translation (-50, -50)
      const eyeTransform = `translate(${animState.current.pupilX - 50}px, ${animState.current.pupilY - 50}px) scale(1, ${scaleY})`;
      
      if (leftEyeRef.current) {
        leftEyeRef.current.style.transform = eyeTransform;
      }
      if (rightEyeRef.current) {
        rightEyeRef.current.style.transform = eyeTransform;
      }

      // Move pupils (inner detail) slightly more for parallax depth
      // Pupil also needs centering (-50, -50) to align with the 0..100 coordinate space centered on the group
      const pupilTransform = `translate(${animState.current.pupilX * 1.5 - 50}px, ${animState.current.pupilY * 1.5 - 50}px) scale(1, ${scaleY})`;
      if (leftPupilRef.current) leftPupilRef.current.style.transform = pupilTransform;
      if (rightPupilRef.current) rightPupilRef.current.style.transform = pupilTransform;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state]);

  // Base color - Cyan for Cozmo, Red for Error/Angry
  const baseColor = (emotion === Emotion.ANGRY || state === AppState.ERROR) ? '#ef4444' : '#06b6d4'; // Red-500 or Cyan-500
  
  return (
    <div className="relative flex items-center justify-center" style={{ width, height }}>
      {/* Main Screen Container */}
      <svg 
        ref={containerRef}
        viewBox="0 0 300 180" 
        className="w-full h-full bg-black rounded-xl shadow-2xl overflow-hidden border-4 border-gray-800"
        style={{
            boxShadow: `0 0 40px ${baseColor}30` // Outer ambient glow
        }}
      >
        <defs>
          {/* Digital Glow Filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Scanline Pattern */}
          <pattern id="scanlines" x="0" y="0" width="1" height="4" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="1" height="2" fill="rgba(0,0,0,0.3)" />
          </pattern>
          
          {/* Grid Pattern */}
          <pattern id="grid" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
          </pattern>
        </defs>

        {/* Background Grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Left Eye Group - Moved inward to 75 */}
        <g transform="translate(75, 90)"> 
           <path
             ref={leftEyeRef}
             d={EYE_PATHS[emotion] || EYE_PATHS[Emotion.NEUTRAL]}
             fill={baseColor}
             filter="url(#glow)"
             className="transition-[d] duration-300 ease-out origin-center" // CSS transition for shape morphing
             transformOrigin="center"
             transform="translate(-50, -50)" // Initial center
           />
           {/* Inner Pupil Detail for Depth */}
           <rect
             ref={leftPupilRef}
             x="35" y="35" width="30" height="30" rx="5"
             fill="rgba(0,0,0,0.3)"
             className="origin-center transition-opacity duration-300"
             transform="translate(-50, -50)" // Initial center
           />
           {/* Highlight - Centered coordinates relative to group */}
           <circle cx="-25" cy="-25" r="8" fill="white" opacity="0.8" />
           <circle cx="-15" cy="-18" r="3" fill="white" opacity="0.5" />
        </g>

        {/* Right Eye Group - Moved inward to 225 */}
        <g transform="translate(225, 90)"> 
           <path
             ref={rightEyeRef}
             d={EYE_PATHS[emotion] || EYE_PATHS[Emotion.NEUTRAL]}
             fill={baseColor}
             filter="url(#glow)"
             className="transition-[d] duration-300 ease-out origin-center"
             transformOrigin="center"
             transform="translate(-50, -50)"
           />
           {/* Inner Pupil Detail */}
           <rect
             ref={rightPupilRef}
             x="35" y="35" width="30" height="30" rx="5"
             fill="rgba(0,0,0,0.3)"
             className="origin-center transition-opacity duration-300"
             transform="translate(-50, -50)"
           />
           {/* Highlight */}
           <circle cx="-25" cy="-25" r="8" fill="white" opacity="0.8" />
           <circle cx="-15" cy="-18" r="3" fill="white" opacity="0.5" />
        </g>

        {/* Scanline Overlay */}
        <rect width="100%" height="100%" fill="url(#scanlines)" pointerEvents="none" />
        
        {/* Screen Glass Reflection (Glare) */}
        <path 
            d="M 0 0 L 300 0 L 300 180 Z" 
            fill="url(#glassGradient)" 
            opacity="0.1" 
            pointerEvents="none"
        />
        <defs>
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
        </defs>

      </svg>
    </div>
  );
};

export default RobotFace;