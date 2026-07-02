import React, { useEffect, useState, useRef } from "react";

interface AnimatedAvatarProps {
  imageSrc: string;
  text: string;
  audioBase64?: string;
}

const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({ imageSrc, text, audioBase64 }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [mouthYOffset, setMouthYOffset] = useState(0);
  
  const landmarksRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await (window as any).faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
      }
    };
    
    if (typeof (window as any).faceapi !== 'undefined') {
      loadModels();
    } else {
      const interval = setInterval(() => {
        if (typeof (window as any).faceapi !== 'undefined') {
          clearInterval(interval);
          loadModels();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // Handle Gemini Native Audio Playback & Real-Time Lip Sync
  useEffect(() => {
    if (!audioBase64) return;
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    cancelAnimationFrame(animationFrameRef.current);

    const audio = new Audio(audioBase64);
    currentAudioRef.current = audio;
    audio.crossOrigin = "anonymous";
    
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }

    try {
      if (!analyserRef.current) {
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }
      
      const source = audioCtxRef.current.createMediaElementSource(audio);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
    } catch (e) {
      console.warn("Web Audio API connection error (might happen if re-connected)", e);
    }

    const dataArray = new Uint8Array(analyserRef.current?.frequencyBinCount || 0);

    const updateLipSync = () => {
      if (!analyserRef.current || audio.paused || audio.ended) {
         setMouthYOffset(0);
         return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      // Use the first 15 frequency bins which cover vocal ranges
      for (let i = 0; i < 15; i++) {
        sum += dataArray[i];
      }
      const avg = sum / 15;
      
      // Map average volume to a pixel offset for the jaw (0 to max 25px)
      const mappedOffset = Math.min(25, (avg / 255) * 25);
      
      setMouthYOffset(prev => prev + (mappedOffset - prev) * 0.5); // smoothing
      
      animationFrameRef.current = requestAnimationFrame(updateLipSync);
    };

    audio.onplay = () => {
      setIsSpeaking(true);
      updateLipSync();
    };
    
    audio.onended = () => {
      setIsSpeaking(false);
      setMouthYOffset(0);
      cancelAnimationFrame(animationFrameRef.current);
    };
    
    audio.onerror = () => {
      setIsSpeaking(false);
      setMouthYOffset(0);
      cancelAnimationFrame(animationFrameRef.current);
    };

    audio.play().catch(e => console.error("Audio playback failed", e));

    return () => {
      audio.pause();
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioBase64]);

  // Fallback to robotic browser TTS if no Gemini audio is provided
  useEffect(() => {
    if (audioBase64 || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    let talkInterval: any;

    utterance.onstart = () => {
      setIsSpeaking(true);
      talkInterval = setInterval(() => {
        setMouthYOffset(Math.random() * 10 + 5);
      }, 150);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setMouthYOffset(0);
      clearInterval(talkInterval);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setMouthYOffset(0);
      clearInterval(talkInterval);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    
    return () => {
      window.speechSynthesis.cancel();
      clearInterval(talkInterval);
      setMouthYOffset(0);
    };
  }, [text, audioBase64]);

  // Face Detection (Runs ONCE per imageSrc)
  useEffect(() => {
    const detectFace = async () => {
      if (!modelsLoaded || !imageSrc || !imageRef.current || !canvasRef.current) return;
      
      const img = imageRef.current;
      
      const runDetection = async () => {
        setIsDetecting(true);
        landmarksRef.current = null;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        canvas.width = 400;
        canvas.height = 400;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        try {
          const detection = await (window as any).faceapi
            .detectSingleFace(canvas, new (window as any).faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks();
            
          if (detection) {
            landmarksRef.current = detection.landmarks;
          }
        } catch (err) {
          console.warn("Face detection failed:", err);
        } finally {
          setIsDetecting(false);
          drawAvatar();
        }
      };

      if (img.complete && img.naturalWidth > 0) {
        runDetection();
      } else {
        img.onload = () => runDetection();
      }
    };
    
    detectFace();
  }, [imageSrc, modelsLoaded]);

  // Drawing Loop
  const drawAvatar = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !img.complete) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    const landmarks = landmarksRef.current;
    if (landmarks) {
      const jawOutline = landmarks.getJawOutline();
      const bottomMouth = landmarks.getMouth(); 
      
      const leftMouth = bottomMouth[0];
      const rightMouth = bottomMouth[6];
      const sliceY = (leftMouth.y + rightMouth.y) / 2;
      
      if (isSpeaking && mouthYOffset > 0) {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.ellipse(
           (leftMouth.x + rightMouth.x) / 2,
           sliceY,
           (rightMouth.x - leftMouth.x) * 0.7,
           mouthYOffset + 5,
           0, 0, 2 * Math.PI
        );
        ctx.fill();
      }
      
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(jawOutline[0].x, jawOutline[0].y);
      ctx.lineTo(leftMouth.x - 10, leftMouth.y);
      ctx.lineTo(rightMouth.x + 10, rightMouth.y);
      ctx.lineTo(jawOutline[16].x, jawOutline[16].y);
      
      for (let i = 15; i >= 1; i--) {
        ctx.lineTo(jawOutline[i].x, jawOutline[i].y);
      }
      ctx.closePath();
      ctx.clip();
      
      const dynamicOffset = isSpeaking ? mouthYOffset : 0;
      ctx.translate(0, dynamicOffset);
      
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      ctx.restore();
    }
  };

  useEffect(() => {
    if (!isDetecting) {
      drawAvatar();
    }
  }, [mouthYOffset, isSpeaking, isDetecting]);

  return (
    // Increased the size here from w-48 h-48 to w-80 h-80 (much larger!)
    <div className="relative w-80 h-80 mx-auto rounded-full overflow-hidden border border-[#334155] shadow-xl flex items-center justify-center bg-gray-900">
      <img 
        ref={imageRef} 
        src={imageSrc} 
        alt="hidden-source" 
        style={{ display: 'none' }} 
        crossOrigin="anonymous"
      />
      {(!modelsLoaded || isDetecting) ? (
        <div className="flex flex-col items-center justify-center z-10 absolute inset-0 bg-gray-900/80">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-xs text-indigo-400 font-mono">
            {!modelsLoaded ? "LOADING MESH" : "DETECTING FACE"}
          </span>
        </div>
      ) : null}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover relative z-0"
      />
    </div>
  );
};

export default AnimatedAvatar;
