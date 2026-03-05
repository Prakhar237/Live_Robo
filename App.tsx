import React, { useState, useEffect, useRef } from 'react';
import RobotFace from './components/RobotFace';
import { GeminiLiveClient } from './services/geminiService';
import { AppState, Emotion, RobotState } from './types';
import { Mic, MicOff, Power, Radio } from 'lucide-react';

export default function App() {
  const [robotState, setRobotState] = useState<RobotState>({
    status: AppState.IDLE,
    emotion: Emotion.NEUTRAL,
    transcript: '',
    response: '',
  });

  const [connected, setConnected] = useState(false);
  const clientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const toggleConnection = async () => {
    if (connected) {
      clientRef.current?.disconnect();
      setConnected(false);
      setRobotState(prev => ({ ...prev, status: AppState.IDLE }));
    } else {
      // Connect
      setRobotState(prev => ({ ...prev, status: AppState.THINKING, emotion: Emotion.NEUTRAL })); // Transient state while connecting
      
      const client = new GeminiLiveClient({
        onOpen: () => {
          setConnected(true);
          setRobotState(prev => ({ ...prev, status: AppState.LISTENING, emotion: Emotion.HAPPY }));
        },
        onClose: () => {
          setConnected(false);
          setRobotState(prev => ({ ...prev, status: AppState.IDLE, emotion: Emotion.NEUTRAL }));
        },
        onAudioPlay: () => {
          setRobotState(prev => ({ ...prev, status: AppState.SPEAKING }));
        },
        onAudioStop: () => {
          setRobotState(prev => ({ ...prev, status: AppState.LISTENING }));
        },
        onTranscript: (text) => {
          setRobotState(prev => ({ ...prev, response: text }));
        },
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white font-mono overflow-hidden relative">
      
      {/* Robot Face Container */}
      <div className="w-full max-w-4xl aspect-[5/3] relative">
        <RobotFace 
          state={robotState.status} 
          emotion={robotState.emotion}
          width={800} 
          height={480}
        />
        
        {/* Status Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 text-xs tracking-widest pointer-events-none">
           <div className="text-cyan-500/50">SYS.STATUS: {robotState.status}</div>
           <div className="text-cyan-500/50">EMO.MODULE: {robotState.emotion.toUpperCase()}</div>
           <div className={`flex items-center gap-2 ${connected ? 'text-green-500' : 'text-red-500'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              {connected ? 'LIVE_UPLINK_ACTIVE' : 'OFFLINE'}
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="fixed bottom-8 flex flex-col items-center gap-4 w-full px-4">
        
        {/* Interaction Button */}
        <button
          onClick={toggleConnection}
          className={`
            group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full 
            transition-all duration-300 transform hover:scale-105 active:scale-95 border-2
            ${connected 
              ? 'bg-red-900/20 border-red-500 text-red-500 hover:bg-red-900/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
              : 'bg-cyan-900/20 border-cyan-500 text-cyan-400 hover:bg-cyan-900/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
            }
          `}
        >
          {connected ? (
            <>
              <Power className="w-6 h-6" />
              <span className="font-bold tracking-wider">DISCONNECT</span>
            </>
          ) : (
            <>
              <Radio className="w-6 h-6 animate-pulse" />
              <span className="font-bold tracking-wider">CONNECT LIVE</span>
            </>
          )}
        </button>
        
        <div className="text-gray-600 text-xs mt-2 flex gap-4">
          <span>Gemini Live API</span>
          <span>•</span>
          <span>Low Latency Mode</span>
          <span>•</span>
          <span>Voice: Kore</span>
        </div>
      </div>
      
      {/* Background Grid Decoration */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10" 
        style={{
          backgroundImage: 'linear-gradient(#0891b2 1px, transparent 1px), linear-gradient(90deg, #0891b2 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
