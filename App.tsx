import React, { useState, useEffect, useRef } from 'react';
import RobotFace from './components/RobotFace';
import { GeminiLiveClient } from './services/geminiService';
import { AppState, Emotion, RobotState } from './types';
import DebugStats, { DebugMetrics } from './components/DebugStats';
import { Power, Radio, Sparkles, Mic } from 'lucide-react';

export default function App() {
  const [robotState, setRobotState] = useState<RobotState>({
    status: AppState.IDLE,
    emotion: Emotion.NEUTRAL,
    transcript: '',
    response: '',
  });

  const [connected, setConnected] = useState(false);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  // Image Gen States
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Debug Stats State
  const [debugMetrics, setDebugMetrics] = useState<DebugMetrics>({
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    audioQueueSize: 0,
    lastPacketTime: 0,
    connected: false,
    errors: 0
  });

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setImageGenPrompt(prev => prev + " " + finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (clientRef.current) clientRef.current.disconnect();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const toggleConnection = async () => {
    if (connected) {
      clientRef.current?.disconnect();
      setConnected(false);
      setRobotState(prev => ({ ...prev, status: AppState.IDLE }));
    } else {
      setRobotState(prev => ({ ...prev, status: AppState.THINKING, emotion: Emotion.NEUTRAL }));
      const client = new GeminiLiveClient({
        onOpen: () => {
          setConnected(true);
          setRobotState(prev => ({ ...prev, status: AppState.LISTENING, emotion: Emotion.HAPPY }));
        },
        onClose: () => {
          setConnected(false);
          setRobotState(prev => ({ ...prev, status: AppState.IDLE, emotion: Emotion.NEUTRAL }));
        },
        onAudioPlay: () => setRobotState(prev => ({ ...prev, status: AppState.SPEAKING })),
        onAudioStop: () => setRobotState(prev => ({ ...prev, status: AppState.LISTENING })),
        onTranscript: (text) => setRobotState(prev => ({ ...prev, response: text })),
        onStatsUpdate: (stats) => setDebugMetrics(stats),
      });

      clientRef.current = client;
      try {
        await client.connect();
      } catch (e) {
        console.error("Failed to connect", e);
        setRobotState(prev => ({ ...prev, status: AppState.ERROR, emotion: Emotion.SAD }));
      }
    }
  };

  const startImagineForMe = () => {
    // Disconnect Gemini Live if connected
    if (connected) {
      clientRef.current?.disconnect();
      setConnected(false);
    }

    // Reset states
    setImageGenPrompt("");
    setGeneratedImageUrl(null);
    setIsGenerating(false);
    setGenerationProgress(0);

    // Phase A: Countdown
    setRobotState(prev => ({ ...prev, status: AppState.IMAGE_GEN_COUNTDOWN }));

    // After 4s, Phase B: Recording
    setTimeout(() => {
      setRobotState(prev => ({ ...prev, status: AppState.IMAGE_GEN_RECORDING }));
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Speech recognition failed to start", e);
      }
    }, 4000);
  };

  const generateIdea = async () => {
    if (isGenerating || !imageGenPrompt.trim()) return;

    recognitionRef.current?.stop();
    setIsGenerating(true);
    setGenerationProgress(0);
    setRobotState(prev => ({ ...prev, status: AppState.IMAGE_GEN_GENERATING }));

    // Start progress loader
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 98) return prev;
        // Slow down as it gets closer to 100
        const increment = prev > 80 ? 1 : prev > 50 ? 5 : 10;
        return Math.min(prev + increment, 98);
      });
    }, 500);

    try {
      const apiKey = import.meta.env.VITE_API_KEY;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey as string,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: imageGenPrompt }]
          }]
        })
      });

      const data = await res.json();
      const imageBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      const mimeType = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/jpeg';

      if (imageBase64) {
        setGeneratedImageUrl(`data:${mimeType};base64,${imageBase64}`);
      } else {
        console.error("Failed to generate image", data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setIsGenerating(false);
      setRobotState(prev => ({ ...prev, status: AppState.IMAGE_GEN_RESULT }));
    }
  };

  const newIdea = () => {
    if (isGenerating) return;
    recognitionRef.current?.stop();

    // Tweak 1: Bypass Countdown entirely
    setImageGenPrompt("");
    setGeneratedImageUrl(null);
    setGenerationProgress(0);
    setRobotState(prev => ({ ...prev, status: AppState.IMAGE_GEN_RECORDING }));

    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error("Speech recognition failed to start", e);
    }
  };

  const backToSpeak = () => {
    if (isGenerating) return;
    recognitionRef.current?.stop();
    setRobotState(prev => ({ ...prev, status: AppState.IMAGE_GEN_TRANSITION_BACK }));
  };

  // Called when a non-looping video finishes playing
  const handleRobotVideoEnded = () => {
    if (robotState.status === AppState.IMAGE_GEN_TRANSITION_BACK) {
      setRobotState(prev => ({ ...prev, status: AppState.IDLE }));
    }
  };

  // Layout Renders
  const isImageGenMode = [
    AppState.IMAGE_GEN_COUNTDOWN,
    AppState.IMAGE_GEN_RECORDING,
    AppState.IMAGE_GEN_GENERATING,
    AppState.IMAGE_GEN_RESULT
  ].includes(robotState.status);

  const isSplitScreen = [
    AppState.IMAGE_GEN_RECORDING,
    AppState.IMAGE_GEN_GENERATING,
    AppState.IMAGE_GEN_RESULT
  ].includes(robotState.status);

  return (
    <div className="flex w-full min-h-screen bg-[#000000] overflow-hidden relative font-body text-white">

      {/* Temporary Debug Stats Panel */}
      <DebugStats metrics={debugMetrics} />

      {/* LEFT / FULL SCREEN: RobotFace */}
      {/* 55% width for split screen */}
      <div className={`absolute inset-y-0 left-0 transition-all duration-700 ease-in-out z-0 flex items-center justify-center bg-[#000000] ${isSplitScreen ? 'w-[55%]' : 'w-full'}`}>
        <RobotFace
          state={robotState.status}
          emotion={robotState.emotion}
          width="100%"
          height="100%"
          onVideoEnded={handleRobotVideoEnded}
        />

        {/* Countdown Subtitle overlay */}
        {robotState.status === AppState.IMAGE_GEN_COUNTDOWN && (
          <div className="absolute inset-0 flex items-end justify-center pb-24 z-10 pointer-events-none fade-in duration-500">
            <div className="bg-[#0a1628]/90 px-8 py-4 rounded-xl text-3xl font-heading tracking-wider animate-pulse border border-[#00d4ff]/40 backdrop-blur-md shadow-[0_0_40px_rgba(0,212,255,0.3)]">
              You can tell your Idea to me in <span className="text-[#00d4ff] font-bold">4....3....2....1....</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SCREEN: Compact Image Gen Canvas (45% Width Column) */}
      <div className={`absolute inset-y-0 right-0 h-full transition-all duration-700 ease-in-out z-0 flex items-center justify-center ${isSplitScreen ? 'w-[45%] translate-x-0 opacity-100' : 'w-[45%] translate-x-full opacity-0 pointer-events-none'}`}>

        {/* Panel Container (Matches image: #131b2a background, big rounded corners) */}
        <div
          className="flex flex-col bg-[#131b2a] rounded-[24px] p-4 gap-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/5"
          style={{ width: 'clamp(320px, 40vw, 500px)' }}
        >
          {/* Inner Image Canvas Area - Soft cloud gradient */}
          <div className="w-full min-h-[300px] h-auto rounded-[20px] flex flex-col items-center justify-center overflow-hidden relative shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]"
            style={!generatedImageUrl ? { background: 'linear-gradient(180deg, #ade1fc 0%, #e1f4ff 50%, #ffffff 100%)' } : { background: '#000' }}
          >

            {generatedImageUrl && robotState.status === AppState.IMAGE_GEN_RESULT ? (
              // Final Generated Image
              <>
                <img src={generatedImageUrl} alt="Generated" className="w-full h-auto object-contain z-20 relative rounded-[20px]" />

                {/* Tweak 3: Download Button Overlay */}
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImageUrl;
                    link.download = `imagine-for-me-${Date.now()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="absolute bottom-4 right-4 z-30 bg-[#131b2a]/80 backdrop-blur-md border border-[#00d4ff]/40 text-white px-4 py-2 rounded-[8px] flex items-center gap-2 font-heading font-semibold text-sm shadow-[0_4px_16px_rgba(0,0,0,0.5)] hover:bg-[#131b2a] hover:border-[#00d4ff] hover:shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-all animate-in slide-in-from-bottom"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-[#00d4ff]">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download
                </button>
              </>
            ) : (
              <>
                {/* Cloud background blobs */}
                <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: 'radial-gradient(ellipse at 15% 30%, white 0%, transparent 40%), radial-gradient(ellipse at 85% 20%, white 0%, transparent 35%), radial-gradient(ellipse at 50% 60%, white 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, white 0%, transparent 40%), radial-gradient(ellipse at 15% 85%, white 0%, transparent 45%)' }} />

                {/* Picture Icon Centerpiece */}
                <div className="relative z-10 w-52 h-40 rounded-[16px] border-[6px] border-white/90 bg-white/30 backdrop-blur-[2px] flex items-center justify-center shadow-[0_10px_30px_rgba(0,125,237,0.15)] overflow-hidden scale-90 sm:scale-100 transition-transform">
                  <div className="absolute top-5 left-[35%] w-8 h-8 rounded-full bg-gradient-to-b from-[#82d8ff] to-[#0e7eda] shadow-sm"></div>
                  <svg className="absolute bottom-0 w-[120%] h-28 -left-3" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0 100 L25 35 L55 85 L85 20 L120 100 Z" fill="url(#grad1)" opacity="0.8" />
                    <path d="M15 100 L60 45 L105 100 Z" fill="url(#grad2)" opacity="0.95" />
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#82d8ff', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#0e7eda', stopOpacity: 1 }} />
                      </linearGradient>
                      <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#75d3fb', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#0b62ad', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </>
            )}

            {/* Transcript Overlay during Recording */}
            {robotState.status === AppState.IMAGE_GEN_RECORDING && imageGenPrompt && !generatedImageUrl && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md rounded-xl p-3 shadow-lg z-20 border border-white/60 text-center animate-in slide-in-from-bottom flex items-center justify-center">
                <span className="text-sm font-medium italic text-[#111] leading-relaxed">
                  "{imageGenPrompt}"
                </span>
              </div>
            )}

          </div>

          {/* New Status Bar area matching screenshot */}
          <div className="bg-[#212c3d] rounded-[16px] px-6 py-5 flex items-center justify-between shadow-inner mt-1">
            {isGenerating ? (
              <>
                <span className="text-white font-heading font-extrabold tracking-wide text-[16px]" style={{ textShadow: '0 2px 12px rgba(0, 212, 255, 0.4)' }}>Generating Image -</span>
                <span className="text-white font-heading font-extrabold text-[16px]" style={{ textShadow: '0 2px 12px rgba(0, 212, 255, 0.4)' }}>{generationProgress}%</span>
              </>
            ) : robotState.status === AppState.IMAGE_GEN_RECORDING ? (
              <>
                <span className="text-white font-heading font-extrabold tracking-wide text-[16px]" style={{ textShadow: '0 2px 12px rgba(0, 212, 255, 0.4)' }}>Listening to idea...</span>
                <Mic className="w-5 h-5 text-[#82d8ff] animate-pulse drop-shadow-[0_2px_12px_rgba(0,212,255,0.4)]" />
              </>
            ) : (
              <>
                <span className="text-white font-heading font-extrabold tracking-wide text-[16px] opacity-90" style={{ textShadow: '0 2px 12px rgba(0, 212, 255, 0.4)' }}>Ready to create</span>
                <Sparkles className="w-5 h-5 text-[#82d8ff] drop-shadow-[0_2px_12px_rgba(0,212,255,0.4)]" />
              </>
            )}
          </div>

          {/* Bottom Button Row - Strict Constraints applied */}
          <div className="flex flex-row justify-between items-center gap-3 font-heading mt-1">
            <button
              onClick={newIdea}
              disabled={isGenerating || robotState.status === AppState.IMAGE_GEN_RECORDING}
              className={`flex-1 min-h-[48px] rounded-[12px] bg-[#0e7eda] text-white font-medium text-[14px] transition-all shadow-md 
                disabled:bg-[#1a2b40] disabled:text-gray-500 disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none 
                ${!isGenerating && robotState.status !== AppState.IMAGE_GEN_RECORDING ? 'hover:bg-[#0b65b0]' : ''}`
              }
            >
              New Idea
            </button>
            <button
              onClick={generateIdea}
              disabled={isGenerating || robotState.status === AppState.IMAGE_GEN_RESULT || !imageGenPrompt.trim()}
              className={`flex-1 min-h-[48px] rounded-[12px] bg-[#82d8ff] text-[#111] font-semibold text-[14px] transition-all shadow-md 
                disabled:bg-[#1a2b40] disabled:text-gray-500 disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none 
                ${!isGenerating && robotState.status !== AppState.IMAGE_GEN_RESULT && imageGenPrompt.trim() ? 'hover:bg-[#68addb]' : ''}`
              }
            >
              Generate
            </button>
            <button
              onClick={backToSpeak}
              disabled={isGenerating}
              className={`flex-1 min-h-[48px] rounded-[12px] bg-[#7aabcd] text-white font-medium text-[14px] transition-all shadow-md 
                disabled:bg-[#1a2b40] disabled:text-gray-500 disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none
                ${!isGenerating ? 'hover:bg-[#618eaa]' : ''}`
              }
            >
              Back To Speaking
            </button>
          </div>
        </div>

      </div>

      {/* DEFAULT CONTROLS (Only in Speaking State / Idle) */}
      {/* Tweak 4: Redesign the Main Footer Buttons */}
      {!isImageGenMode && robotState.status !== AppState.IMAGE_GEN_TRANSITION_BACK && (
        <div className="fixed bottom-8 flex items-center justify-center gap-8 w-full px-4 z-20 fade-in duration-500">

          <button
            onClick={toggleConnection}
            className={`
              group relative flex items-center justify-center gap-3 px-6 py-3 rounded-[10px] 
              transition-all duration-300 transform hover:scale-105 active:scale-95 border font-heading
              ${connected
                ? 'bg-red-950/80 text-white hover:bg-red-900 shadow-[0_0_16px_rgba(239,68,68,0.5)] border-red-500/50 backdrop-blur-xl'
                : 'bg-[#0a1628] text-white hover:bg-[#10203a] shadow-[0_0_16px_rgba(0,212,255,0.5)] border-[#00d4ff] backdrop-blur-xl'
              }
            `}
          >
            {connected ? (
              <>
                <Power className="w-5 h-5 text-red-400" />
                <span className="font-semibold tracking-widest text-base">DISCONNECT</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-[#00d4ff] group-hover:scale-110 transition-transform" />
                <span className="font-semibold tracking-widest text-base">Connect to Speak to Robot</span>
              </>
            )}
          </button>

          <button
            onClick={startImagineForMe}
            className="group relative flex items-center justify-center gap-3 px-6 py-3 rounded-[10px] bg-[#0a1628] border border-[#00d4ff] text-white hover:bg-[#10203a] hover:shadow-[0_0_16px_rgba(0,212,255,0.5)] transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_16px_rgba(0,212,255,0.3)] backdrop-blur-xl font-heading"
          >
            <Sparkles className="w-5 h-5 text-[#00d4ff] group-hover:rotate-12 transition-transform" />
            <span className="font-semibold tracking-widest text-base">Imagine For Me</span>
          </button>

        </div>
      )}
    </div>
  );
}
