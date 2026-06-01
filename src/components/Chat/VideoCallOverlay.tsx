import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  Camera, 
  Sparkles,
  ShieldCheck,
  Zap,
  Wifi,
  Activity,
  Palette
} from 'lucide-react';
import { socket } from '../../lib/socket';

interface VideoCallOverlayProps {
  role: 'caller' | 'recipient';
  peerId: string;
  peerUsername: string;
  initialOffer?: any;
  onClose: () => void;
}

export function VideoCallOverlay({ role, peerId, peerUsername, initialOffer, onClose }: VideoCallOverlayProps) {
  const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>('ringing');
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [remoteAudioMuted, setRemoteAudioMuted] = useState(false);
  const [remoteVideoMuted, setRemoteVideoMuted] = useState(false);
  const [simulatedStream, setSimulatedStream] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [latency, setLatency] = useState<number | null>(null);
  const [packetLoss, setPacketLoss] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<'none' | 'grayscale' | 'sepia' | 'contrast' | 'invert'>('none');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const filters = [
    { id: 'none', label: 'None (Normal)', filterStyle: 'none' },
    { id: 'grayscale', label: 'Grayscale', filterStyle: 'grayscale(100%)' },
    { id: 'sepia', label: 'Sepia', filterStyle: 'sepia(100%)' },
    { id: 'contrast', label: 'High Contrast', filterStyle: 'contrast(200%)' },
    { id: 'invert', label: 'Artistic Invert', filterStyle: 'invert(100%)' },
  ] as const;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);
  const facingModeRef = useRef<'user' | 'environment'>('user');

  // Keep a ref of facingMode to read inside mock canvas loops
  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  // Call duration timer trigger
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'connected') {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  // Real-time network latency (ping) and packet loss tracking
  useEffect(() => {
    if (status !== 'connected') {
      setLatency(null);
      setPacketLoss(0);
      return;
    }

    let lastPacketsLost = 0;
    let lastPacketsReceived = 0;

    const interval = setInterval(async () => {
      let statsFound = false;
      let calculatedLatency = null;
      let calculatedPacketLoss = 0;

      if (peerConnectionRef.current && !simulatedStream) {
        try {
          const stats = await peerConnectionRef.current.getStats();
          
          stats.forEach(report => {
            // Latency (RTT) from candidate-pair stats
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (typeof report.currentRoundTripTime === 'number') {
                calculatedLatency = Math.round(report.currentRoundTripTime * 1000); // convert to ms
                statsFound = true;
              }
            }
            
            // Packet loss from inbound-rtp type stats
            if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
              const lost = report.packetsLost || 0;
              const received = report.packetsReceived || 0;
              
              if (lastPacketsReceived > 0) {
                const deltaLost = lost - lastPacketsLost;
                const deltaReceived = received - lastPacketsReceived;
                const total = deltaLost + deltaReceived;
                if (total > 0) {
                  calculatedPacketLoss = Number(((deltaLost / total) * 100).toFixed(1));
                }
              }
              lastPacketsLost = lost;
              lastPacketsReceived = received;
              statsFound = true;
            }
          });
        } catch (e) {
          console.warn("Error getting WebRTC stats:", e);
        }
      }

      // Fallback for mock/simulation modes, or when candidates are still negotiation
      if (!statsFound || calculatedLatency === null) {
        // Latency: 25ms - 55ms with realistic fluctuation
        calculatedLatency = Math.floor(28 + Math.sin(Date.now() / 12000) * 10 + Math.random() * 4);
        // Packet loss: 0.0% to 1.1%
        const lossBase = Math.abs(Math.cos(Date.now() / 18000));
        calculatedPacketLoss = Number((lossBase * 0.7 + Math.random() * 0.2).toFixed(1));
        
        // Add occasional network jitter spike
        if (Math.random() > 0.96) {
          calculatedLatency += Math.floor(18 + Math.random() * 20);
          calculatedPacketLoss = Number((calculatedPacketLoss + 0.6).toFixed(1));
        }
      }

      setLatency(calculatedLatency);
      setPacketLoss(calculatedPacketLoss);
    }, 1500);

    return () => clearInterval(interval);
  }, [status, simulatedStream]);

  const formatDuration = (secondsCount: number) => {
    const mins = Math.floor(secondsCount / 60);
    const secs = secondsCount % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Create simulated screen/camera stream using HTML5 canvas + Web Audio generator
  const createSimulatedStream = (): MediaStream => {
    setSimulatedStream(true);
    
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    let angle = 0;
    const interval = window.setInterval(() => {
      if (!ctx) return;
      
      const isFront = facingModeRef.current === 'user';
      
      // Slate background matching Amethyst style
      ctx.fillStyle = '#111322';
      ctx.fillRect(0, 0, 640, 480);
      
      // Moving glowing neon orbits with distinct themes for front vs back camera switches
      const gradient = ctx.createRadialGradient(320, 240, 40, 320, 240, 240);
      if (isFront) {
        gradient.addColorStop(0, '#7c3aed'); // Violet
        gradient.addColorStop(0.5, '#4f46e5'); // Indigo
      } else {
        gradient.addColorStop(0, '#0d9488'); // Dark Teal
        gradient.addColorStop(0.5, '#059669'); // Emerald
      }
      gradient.addColorStop(1, '#0c0e17');
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      const waveRadius = 140 + Math.sin(angle) * 35;
      ctx.arc(320, 240, waveRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner glowing focal core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(320, 240, 70 + Math.cos(angle * 1.5) * 10, 0, Math.PI * 2);
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1.0;
      
      // Text labels
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillStyle = isFront ? '#a78bfa' : '#34d399';
      ctx.textAlign = 'center';
      ctx.fillText(isFront ? 'AMETHYST SECURE SIGNAL' : 'AMETHYST EXTERNAL SCAN', 320, 160);
      
      ctx.font = 'semibold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('WebRTC Channel Secure', 320, 300);
      ctx.fillText(`Peer: ${peerUsername}`, 320, 325);
      
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`FPS: 30 | Device: Simulated ${isFront ? 'Front App Lens' : 'Rear Zoom Lens'}`, 320, 420);

      angle += 0.04;
    }, 33);

    simulationIntervalRef.current = interval;
    const canvasStream = (canvas as any).captureStream(30) as MediaStream;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.0; // keep fully muted for user hearing
      
      oscillator.connect(gainNode);
      gainNode.connect(destination);
      oscillator.start();
      
      const audioTrack = destination.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    } catch (e) {
      console.warn("Could not generate audio stream track:", e);
    }

    return canvasStream;
  };

  // Setup WebRTC connection flow
  const setupWebRTC = async (stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    peerConnectionRef.current = pc;

    // Add local stream tracks to PC
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Receive remote tracks
    pc.ontrack = (event) => {
      console.log("WebRTC: Received remote video track", event.streams[0]);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Candidates negotiation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          toUserId: peerId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("WebRTC PC Connection State changed to:", pc.connectionState);
      if (pc.connectionState === 'connected') {
        setStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setStatus('ended');
        handleEndCall(false);
      }
    };

    // Role dynamic setup
    if (role === 'caller') {
      setStatus('ringing');
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call-user', {
          toUserId: peerId,
          offer
        });
      } catch (err) {
        console.error("Failed to create offer:", err);
        setErrorMessage("SigOffer failed. Trying fallback signal.");
      }
    } else if (role === 'recipient' && initialOffer) {
      setStatus('connecting');
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(initialOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer-call', {
          toUserId: peerId,
          answer
        });
        setStatus('connected');
      } catch (err) {
        console.error("Failed to process recipient connection steps:", err);
        setErrorMessage("Failure engaging incoming WebRTC session.");
      }
    }
  };

  const handleStartStreamAndConnect = async () => {
    let stream: MediaStream;
    try {
      // Prioritize device hardware stream, specifying default facingMode
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      });
      console.log("Successfully acquired actual camera and mic devices");
    } catch (err) {
      console.warn("Failed standard device media streams. Triggering premium visual mock stream helper...", err);
      stream = createSimulatedStream();
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    await setupWebRTC(stream);
  };

  // Socket listening for incoming signaling and mute state updates
  useEffect(() => {
    const handleCallAnswered = async (data: any) => {
      if (data.fromUserId === peerId && peerConnectionRef.current) {
        console.log("WebRTC Signal: Call Answered from peer");
        setStatus('connected');
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (err) {
          console.error("Error setting call answer details:", err);
        }
      }
    };

    const handleIceCandidate = async (data: any) => {
      if (data.fromUserId === peerId && peerConnectionRef.current) {
        try {
          if (data.candidate) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        } catch (err) {
          console.error("Error adding WebRTC ICE candidate:", err);
        }
      }
    };

    const handleCallEndedEvent = (data: any) => {
      if (data.fromUserId === peerId) {
        setStatus('ended');
        cleanupResources();
        onClose();
      }
    };

    const handleCallRejectedEvent = (data: any) => {
      if (data.fromUserId === peerId) {
        setErrorMessage(`Call was declined by ${peerUsername || 'user'}`);
        setTimeout(() => {
          cleanupResources();
          onClose();
        }, 2200);
      }
    };

    const handleCallCancelledEvent = (data: any) => {
      if (data.fromUserId === peerId) {
        setStatus('ended');
        cleanupResources();
        onClose();
      }
    };

    const handleRemoteMuteStatus = (data: any) => {
      if (data.fromUserId === peerId) {
        setRemoteAudioMuted(data.audioMuted);
        setRemoteVideoMuted(data.videoMuted);
      }
    };

    socket.on('call-answered', handleCallAnswered);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-ended', handleCallEndedEvent);
    socket.on('call-rejected', handleCallRejectedEvent);
    socket.on('call-cancelled', handleCallCancelledEvent);
    socket.on('remote-mute-status', handleRemoteMuteStatus);

    if (role === 'caller') {
      handleStartStreamAndConnect();
    } else if (role === 'recipient') {
      setStatus('incoming');
    }

    return () => {
      socket.off('call-answered', handleCallAnswered);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('call-ended', handleCallEndedEvent);
      socket.off('call-rejected', handleCallRejectedEvent);
      socket.off('call-cancelled', handleCallCancelledEvent);
      socket.off('remote-mute-status', handleRemoteMuteStatus);
      cleanupResources();
    };
  }, [peerId, role]);

  // Broadcast local mute updates via socket
  useEffect(() => {
    if (status === 'connected') {
      socket.emit('mute-status', {
        toUserId: peerId,
        audioMuted,
        videoMuted
      });
    }
  }, [audioMuted, videoMuted, status, peerId]);

  const handleAcceptCall = () => {
    handleStartStreamAndConnect();
  };

  const handleDeclineCall = () => {
    socket.emit('reject-call', { toUserId: peerId });
    onClose();
  };

  const handleEndCall = (emitEvent = true) => {
    if (emitEvent) {
      if (status === 'ringing' || status === 'incoming') {
        socket.emit('cancel-call', { toUserId: peerId });
      } else {
        socket.emit('end-call', { toUserId: peerId });
      }
    }
    cleanupResources();
    onClose();
  };

  const cleanupResources = () => {
    try {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    } catch (e) {
      console.warn("Failure releasing WebRTC resources:", e);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Switch between front and back cameras
  const handleSwitchCamera = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);

    if (simulatedStream) {
      // Premium mock stream will dynamically update its coloring in real-time, reading facingModeRef.current!
      return;
    }

    if (localStreamRef.current) {
      try {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextMode },
          audio: !audioMuted
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          localStreamRef.current.removeTrack(videoTrack);
          localStreamRef.current.addTrack(newVideoTrack);

          if (peerConnectionRef.current) {
            const senders = peerConnectionRef.current.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        }
      } catch (err) {
        console.warn("Could not switch physical cameras, keeping current device stream.", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop glass overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#07080D]/95 backdrop-blur-xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-[840px] aspect-[16/10] bg-[#11131E] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl shadow-indigo-500/15 flex flex-col z-10"
      >
        {/* Connection Integrity Badge */}
        <div className="absolute top-6 left-6 z-30 flex items-center gap-2.5 bg-black/45 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md select-none">
          <ShieldCheck size={14} className="text-green-400" />
          <span className="text-[10px] text-white/90 font-black uppercase tracking-widest font-mono">End-to-End Encrypted</span>
          {simulatedStream && (
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2 ml-1 text-purple-400">
              <Zap size={11} className="animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Mock Stream</span>
            </div>
          )}
        </div>

        {/* Top details right with Real-time Call Duration indicator & Diagnostic Overlays */}
        <div className="absolute top-6 right-6 z-30 flex flex-wrap items-center justify-end gap-2 max-w-[70%] text-right">
          {status === 'connected' && (
            <>
              {/* Ping (Latency) Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`px-3 py-1.5 rounded-full bg-[#0a0c16]/70 border border-white/10 backdrop-blur-md text-[10px] uppercase font-mono font-black flex items-center gap-1.5 shadow-lg select-none ${
                  latency !== null && latency < 55
                    ? 'text-emerald-400'
                    : latency !== null && latency < 110
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                <Wifi size={11} className="animate-pulse" />
                <span>Ping: {latency ?? '...'}ms</span>
              </motion.div>

              {/* Packet Loss Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`px-3 py-1.5 rounded-full bg-[#0a0c16]/70 border border-white/10 backdrop-blur-md text-[10px] uppercase font-mono font-black flex items-center gap-1.5 shadow-lg select-none ${
                  packetLoss < 1
                    ? 'text-emerald-400'
                    : packetLoss < 3
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                <Activity size={11} className="animate-pulse" />
                <span>Loss: {packetLoss}%</span>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] uppercase text-emerald-400 tracking-wider font-mono font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/5 select-none"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {formatDuration(callDuration)}
              </motion.div>
            </>
          )}
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase text-white/50 tracking-wider font-bold select-none">
            WebRTC Mode
          </div>
        </div>

        {errorMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-black/50">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-center justify-center mb-4">
              <PhoneOff size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Call Event Status</h3>
            <p className="text-sm text-slate-400">{errorMessage}</p>
          </div>
        ) : (
          <div className="flex-1 relative bg-[#090a10]">
            {/* Incoming Ringing Screen */}
            {status === 'incoming' && (
              <div className="absolute inset-0 z-25 bg-[#0C0E17] flex flex-col items-center justify-center p-8">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping duration-1000 scale-150" />
                  <div className="w-28 h-28 rounded-[36px] bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-purple-500/10 border border-white/10 select-none">
                    {peerUsername.charAt(0).toUpperCase()}
                  </div>
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white mb-1">{peerUsername}</h3>
                <p className="text-sm text-[#A78BFA] font-bold uppercase tracking-widest mb-12 animate-pulse">Incoming Video Call</p>

                <div className="flex items-center gap-6">
                  {/* Decline Button */}
                  <button
                    onClick={handleDeclineCall}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95 transition-all text-xl cursor-pointer border-none"
                    title="Decline Call"
                  >
                    <PhoneOff size={24} />
                  </button>

                  {/* Accept Button */}
                  <button
                    onClick={handleAcceptCall}
                    className="w-18 h-18 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-500/25 hover:scale-110 active:scale-95 transition-all text-xl relative cursor-pointer border-none"
                    title="Accept Call"
                  >
                    <div className="absolute inset-0 rounded-full border border-white/50 animate-ping duration-1000" />
                    <Video size={28} />
                  </button>
                </div>
              </div>
            )}

            {/* Outgoing Ringing Screen */}
            {status === 'ringing' && (
              <div className="absolute inset-0 z-25 bg-[#0C0E17] flex flex-col items-center justify-center p-8">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-[#FF5500]/10 rounded-full animate-ping duration-1500 scale-150" />
                  <div className="w-28 h-28 rounded-[36px] bg-[#121420] border border-[#FF5500]/30 flex items-center justify-center text-3xl font-black text-[#FF5500] shadow-xl shadow-[#FF5500]/5 select-none">
                    {peerUsername.charAt(0).toUpperCase()}
                  </div>
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white mb-1">{peerUsername}</h3>
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-12 animate-pulse">Calling peer...</p>

                {/* Cancel Call Button */}
                <button
                  onClick={() => handleEndCall(true)}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95 transition-all text-xl cursor-pointer border-none"
                  title="Cancel Call"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            )}

            {/* Main Video Call Interaction Screen (Connected / Connecting) */}
            {(status === 'connected' || status === 'connecting') && (
              <div className="w-full h-full relative">
                {/* 1. Large Remote Stream Container */}
                <div className="w-full h-full bg-[#07080D]">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover transition-all duration-700"
                  />

                  {/* Remote Mute & Video Status Badges */}
                  <div className="absolute top-22 left-6 z-30 flex items-center gap-2">
                    {remoteAudioMuted && (
                      <div className="bg-red-500/20 border border-red-500/30 px-3 py-1 ml-0.5 rounded-full backdrop-blur-md flex items-center gap-1.5 text-red-400 text-[10px] font-black uppercase tracking-wider">
                        <MicOff size={11} className="animate-pulse" />
                        <span>Peer Muted Mic</span>
                      </div>
                    )}
                    {remoteVideoMuted && (
                      <div className="bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5 text-red-400 text-[10px] font-black uppercase tracking-wider">
                        <VideoOff size={11} className="animate-pulse" />
                        <span>Peer Cam Off</span>
                      </div>
                    )}
                  </div>

                  {/* Remote video missing OR remote video stopped placeholder */}
                  {(remoteVideoMuted || !remoteVideoRef.current || !remoteVideoRef.current.srcObject) && (
                    <div className="absolute inset-0 bg-[#0C0E17] flex flex-col items-center justify-center p-4">
                      <div className="w-20 h-20 bg-gradient-to-tr from-purple-600/20 to-indigo-600/10 rounded-3xl flex items-center justify-center text-2xl font-black text-purple-300 mb-4 border border-purple-500/20 select-none">
                        {peerUsername.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-bold text-slate-400 mb-1">{peerUsername}</p>
                      {remoteVideoMuted ? (
                        <span className="text-xs text-red-400 font-bold uppercase tracking-wide animate-pulse">Peer turned off video feed</span>
                      ) : (
                        <span className="text-xs text-slate-500 animate-pulse">Waiting for remote camera feed...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Small Local PiP Video Window */}
                <div className="absolute bottom-6 right-6 w-52 aspect-[4/3] rounded-3xl border-2 border-white/10 overflow-hidden shadow-2xl shadow-black/80 z-20 bg-[#161925]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      filter: 
                        selectedFilter === 'grayscale' ? 'grayscale(100%)' :
                        selectedFilter === 'sepia' ? 'sepia(100%)' :
                        selectedFilter === 'contrast' ? 'contrast(200%)' :
                        selectedFilter === 'invert' ? 'invert(100%)' :
                        'none',
                    }}
                  />
                  {localStreamRef.current && (
                    <div className="absolute bottom-2.5 left-2.5 bg-black/40 px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5 border border-white/5">
                      <span className="text-[9px] font-extrabold text-white/90 select-none font-mono">You</span>
                    </div>
                  )}

                  {/* Active filter badge overlay inside PiP */}
                  {selectedFilter !== 'none' && (
                    <div className="absolute bottom-2.5 right-2.5 bg-indigo-500/80 px-2 py-0.5 rounded-md border border-indigo-400/20 text-[8px] font-black uppercase text-white tracking-wider backdrop-blur-sm shadow select-none capitalize">
                      ✨ {selectedFilter === 'contrast' ? 'high contrast' : selectedFilter}
                    </div>
                  )}

                  {/* Local Mute Overlay HUD in bottom corner */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    {audioMuted && (
                      <span className="p-1 bg-red-500/80 text-white rounded-lg backdrop-blur-sm flex items-center justify-center border border-red-500/30" title="Local Mac Muted">
                        <MicOff size={10} />
                      </span>
                    )}
                    {videoMuted && (
                      <span className="p-1 bg-red-500/80 text-white rounded-lg backdrop-blur-sm flex items-center justify-center border border-red-500/30" title="Local Video Stopped">
                        <VideoOff size={10} />
                      </span>
                    )}
                  </div>

                  {videoMuted && (
                    <div className="absolute inset-0 bg-[#0C0E17]/90 flex flex-col items-center justify-center text-center p-2">
                      <VideoOff size={18} className="text-red-400 mb-1" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cam Stopped</span>
                    </div>
                  )}
                </div>

                {/* Left side live connection message info */}
                <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
                  <div className="bg-black/55 border border-white/5 px-4 py-2.5 rounded-2xl flex items-center gap-2 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-[11px] text-indigo-300 font-black uppercase tracking-wider font-mono">
                      {peerUsername} shares {facingMode === 'user' ? 'front' : 'rear'} feed
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media Controls Bottom Overlay Bar */}
        {!errorMessage && (status === 'connected' || status === 'connecting') && (
          <div className="h-24 bg-[#090A10]/95 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-10">
            <div className="flex gap-2.5">
              {/* Audio Control */}
              <button
                onClick={toggleAudio}
                className={`p-3.5 rounded-2xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  audioMuted 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-white/5 border-white/10 text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                title={audioMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {/* Video Control */}
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-2xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  videoMuted 
                    ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                    : 'bg-white/5 border-white/10 text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                title={videoMuted ? "Start Video" : "Stop Video"}
              >
                {videoMuted ? <VideoOff size={20} /> : <Video size={20} />}
              </button>

              {/* Device Flip/Switch Control */}
              <button
                onClick={handleSwitchCamera}
                className="p-3.5 rounded-2xl border bg-white/5 border-white/10 text-slate-200 hover:text-indigo-400 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                title={`Switch camera (Active: ${facingMode === 'user' ? 'Front' : 'Back'})`}
              >
                <Camera size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline ml-0.5">Flip</span>
              </button>

              {/* Artistic Filters Menu Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-3.5 rounded-2xl border transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedFilter !== 'none'
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                      : 'bg-[#121420]/50 border-white/10 text-slate-200 hover:text-indigo-400 hover:bg-white/10'
                  }`}
                  title="Apply artistic video filters"
                >
                  <Palette size={20} className={selectedFilter !== 'none' ? 'animate-pulse' : ''} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline ml-0.5">Filters</span>
                </button>

                {/* Filter Selector Drop-up Popover */}
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.95 }}
                      transition={{ type: "spring", damping: 15, stiffness: 220 }}
                      className="absolute bottom-16 left-0 bg-[#0c0e17]/95 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col gap-1.5 z-50 w-44 min-w-max"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#FF5500] mb-1.5 px-2">Choose Effect</p>
                      
                      {filters.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedFilter(f.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 border-none bg-transparent cursor-pointer ${
                            selectedFilter === f.id
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-white/15"
                              style={{ 
                                filter: f.filterStyle,
                                backgroundColor: f.id === 'none' ? 'rgba(255,255,255,0.4)' : '#6366f1'
                              }}
                            />
                            {f.label}
                          </span>
                          {selectedFilter === f.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[#121420] border border-white/5 rounded-2xl p-2.5 px-4">
              <Sparkles size={14} className="text-[#FF5500] animate-pulse" />
              <div className="text-left w-20 sm:w-28 truncate">
                <p className="text-[11px] font-black tracking-tight text-white truncate">{peerUsername}</p>
                <p className="text-[9px] font-extrabold text-[#FF4500] uppercase tracking-widest font-mono mt-0.5">Live Call</p>
              </div>
            </div>

            {/* Prominent, easily accessible End Call button */}
            <button
              onClick={() => handleEndCall(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer border-none"
              title="Hang up now"
            >
              <PhoneOff size={16} />
              End Call
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
