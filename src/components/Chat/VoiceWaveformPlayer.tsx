import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Play, Pause } from "lucide-react";
import { Message } from "../../lib/types";

interface VoiceWaveformPlayerProps {
  message: Message;
  isMe: boolean;
}

export function VoiceWaveformPlayer({ message, isMe }: VoiceWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Set default duration if not defined (e.g., legacy messages)
  const duration = message.duration || 6;

  // Use the provided waveformSamples or generate a beautiful pseudo-random sequence of samples
  const defaultSamples = [12, 18, 14, 22, 10, 8, 20, 16, 24, 18, 12, 16, 14, 26, 8, 10, 22, 18, 14, 20, 12, 16, 22, 10, 18, 12, 14];
  const samples = message.waveformSamples && message.waveformSamples.length > 0 
    ? message.waveformSamples 
    : defaultSamples;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const simIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Playback engine
  useEffect(() => {
    if (isPlaying) {
      if (message.fileUrl && message.fileUrl.startsWith("http")) {
        // Real Audio Playback Mode
        if (!audioRef.current) {
          audioRef.current = new Audio(message.fileUrl);
          audioRef.current.addEventListener("timeupdate", () => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          });
          audioRef.current.addEventListener("ended", () => {
            setIsPlaying(false);
            setCurrentTime(0);
          });
        }
        audioRef.current.play().catch((err) => {
          console.warn("Audio playback failed, switching to simulation:", err);
          startSimulation();
        });
      } else {
        // Simulation Playback Mode for simulated/empty audio notes
        startSimulation();
      }
    } else {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopSimulation();
    }

    return () => {
      stopSimulation();
    };
  }, [isPlaying]);

  const startSimulation = () => {
    stopSimulation();
    startTimeRef.current = Date.now() - currentTime * 1000;
    
    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed >= duration) {
        setCurrentTime(0);
        setIsPlaying(false);
      } else {
        setCurrentTime(elapsed);
        simIntervalRef.current = requestAnimationFrame(tick);
      }
    };
    simIntervalRef.current = requestAnimationFrame(tick);
  };

  const stopSimulation = () => {
    if (simIntervalRef.current !== null) {
      cancelAnimationFrame(simIntervalRef.current);
      simIntervalRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Seek functionality by clicking on the waveform
  const handleSeek = (index: number) => {
    const progress = index / samples.length;
    const targetTime = progress * duration;
    setCurrentTime(targetTime);

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }

    // If simulating, adjust start time ref so simulation continues smoothly from this position
    if (isPlaying) {
      startTimeRef.current = Date.now() - targetTime * 1000;
    }
  };

  // Format time (e.g. 0:03)
  const formatTime = (timeInSecs: number) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const progressRatio = currentTime / duration;

  return (
    <div className="flex items-center gap-4 w-full select-none" id={`voice-player-${message._id}`}>
      {/* Play/Pause Button wraps */}
      <button
        onClick={handleTogglePlay}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 shadow-md ${
          isMe
            ? "bg-white text-indigo-600 hover:bg-white/95"
            : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-500/15"
        }`}
        type="button"
        title={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? (
          <Pause size={18} fill="currentColor" />
        ) : (
          <Play size={18} fill="currentColor" className="ml-1" />
        )}
      </button>

      {/* Waveform track */}
      <div className="flex-1 flex flex-col pt-1">
        <div className="flex gap-[2.5px] h-9 items-end pb-1.5 relative group cursor-pointer">
          {samples.map((h, i) => {
            const barProgress = i / samples.length;
            const isActive = barProgress <= progressRatio;

            // Generate a professional bouncing shift for active bars while playing
            const animationProps = isPlaying && isActive
              ? {
                  y: [0, -3.5, 3.5, 0],
                }
              : {};

            const transitionProps = isPlaying && isActive
              ? {
                  duration: 1.0,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.04,
                }
              : {};

            return (
              <motion.div
                key={i}
                onClick={() => handleSeek(i)}
                animate={animationProps}
                transition={transitionProps}
                className={`w-[3px] rounded-full cursor-pointer transition-colors duration-200 ${
                  isActive
                    ? isMe
                      ? "bg-white"
                      : "bg-indigo-400"
                    : isMe
                      ? "bg-white/35 hover:bg-white/50"
                      : "bg-slate-500/30 hover:bg-slate-500/50"
                }`}
                style={{
                  height: `${Math.max(4, h)}px`,
                  transformOrigin: "bottom",
                }}
                whileHover={{ scaleY: 1.25, transition: { duration: 0.1 } }}
                title={`Seek to ${formatTime((i / samples.length) * duration)}`}
              />
            );
          })}
        </div>

        {/* Time Tracking Row */}
        <div className="flex justify-between items-center mt-0.5">
          <span
            className={`text-[10px] font-bold font-mono tracking-wide ${
              isMe ? "text-white/70" : "text-slate-400"
            }`}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span
            className={`text-[9px] font-bold uppercase tracking-tight font-mono ${
              isMe ? "text-white/50" : "text-slate-500"
            }`}
          >
            Voice Note
          </span>
        </div>
      </div>
    </div>
  );
}
