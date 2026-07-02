import React, { useEffect, useRef, useState } from "react";

/**
 * Avatar component
 * -----------------
 * Displays a static portrait (provided by the user) and animates a simple
 * mouth shape based on the audio waveform of the spoken response. The
 * implementation uses the Web Audio API – no external libraries are required –
 * which satisfies the **local** requirement from the user.
 *
 * Usage:
 *   <Avatar imageSrc="/src/assets/avatar.jpg" audioUrl={generatedAudioUrl} />
 *
 * The `audioUrl` should be a URL pointing to the Gemini TTS audio output. When
 * the URL changes, the component automatically plays the audio and drives the
 * mouth animation.
 */
interface AvatarProps {
  /** Path to the portrait image (relative to the project root) */
  imageSrc: string;
  /** URL of the generated voice audio – when this changes the component plays it */
  audioUrl: string | null;
}

export const Avatar: React.FC<AvatarProps> = ({ imageSrc, audioUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load the portrait image once
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      drawFrame(0); // draw neutral face
    };
  }, [imageSrc]);

  // When a new audioUrl arrives, start playback and animate
  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId: number;

    const render = () => {
      analyser.getByteFrequencyData(dataArray);
      // Use the average of the lower frequencies to drive mouth opening
      const lowerFreq = dataArray.slice(0, dataArray.length / 2);
      const avg = lowerFreq.reduce((a, b) => a + b, 0) / lowerFreq.length;
      const mouthOpen = Math.min(1, avg / 128); // value between 0‑1
      drawFrame(mouthOpen);
      animationFrameId = requestAnimationFrame(render);
    };

    const drawFrame = (mouthOpen: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !imgRef.current) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(imgRef.current, 0, 0, width, height);

      // Simple mouth overlay – a black ellipse that scales vertically
      const mouthWidth = width * 0.3;
      const mouthHeight = height * 0.08 * mouthOpen;
      const mouthX = (width - mouthWidth) / 2;
      const mouthY = height * 0.65;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.ellipse(
        mouthX + mouthWidth / 2,
        mouthY + mouthHeight / 2,
        mouthWidth / 2,
        Math.max(mouthHeight, 2), // keep a thin line when closed
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
    };

    audio.play().then(() => setIsPlaying(true)).catch(console.error);
    render();

    // Cleanup when component unmounts or audioUrl changes
    return () => {
      cancelAnimationFrame(animationFrameId);
      audio.pause();
      audioCtx.close();
      setIsPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  // Canvas size – keep a square aspect ratio for simplicity
  const canvasSize = 200;

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="rounded-full border border-[#1e293b] shadow-lg"
      />
      <div className="text-xs text-gray-400">{isPlaying ? "Speaking…" : "Idle"}</div>
    </div>
  );
};
