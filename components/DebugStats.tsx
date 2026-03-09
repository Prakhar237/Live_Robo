import React, { useState, useEffect } from 'react';

export interface DebugMetrics {
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
    audioQueueSize: number;
    lastPacketTime: number;
    connected: boolean;
    errors: number;
}

interface DebugStatsProps {
    metrics: DebugMetrics;
}

export default function DebugStats({ metrics }: DebugStatsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(interval);
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-4 right-4 z-[999] bg-black/50 hover:bg-black/80 text-xs text-white px-3 py-2 rounded-md border border-white/20 transition-colors shadow-lg flex items-center gap-2"
            >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Debug network
            </button>
        );
    }

    const lag = metrics.lastPacketTime ? (now - metrics.lastPacketTime) : 0;

    return (
        <div className="fixed top-4 right-4 z-[999] bg-black/95 text-[#00ffcc] p-5 rounded-xl border border-[#00ffcc]/30 shadow-[0_0_30px_rgba(0,255,204,0.15)] backdrop-blur-md w-80 font-mono text-xs overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b border-[#00ffcc]/30 pb-2">
                <h3 className="font-bold text-sm tracking-widest text-[#00ffcc] drop-shadow-[0_0_8px_rgba(0,255,204,0.5)]">🛠️ LATENCY STATS</h3>
                <button onClick={() => setIsOpen(false)} className="text-white hover:text-red-400 opacity-70 hover:opacity-100 transition-colors">
                    [X] CLOSE
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="opacity-70">Status:</span>
                    <span className={metrics.connected ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {metrics.connected ? "ONLINE" : "OFFLINE"}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="opacity-70">Audio Pkts Sent:</span>
                    <span>{metrics.packetsSent}</span>
                </div>

                <div className="flex justify-between">
                    <span className="opacity-70">Total Uplink:</span>
                    <span>{(metrics.bytesSent / 1024).toFixed(2)} KB</span>
                </div>

                <div className="flex justify-between">
                    <span className="opacity-70">Audio Pkts Recv:</span>
                    <span>{metrics.packetsReceived}</span>
                </div>

                <div className="flex justify-between">
                    <span className="opacity-70">Total Downlink:</span>
                    <span>{(metrics.bytesReceived / 1024).toFixed(2)} KB</span>
                </div>

                <div className="flex justify-between">
                    <span className="opacity-70">Audio Queue Buffers:</span>
                    <span className={metrics.audioQueueSize > 5 ? "text-yellow-400 font-bold animate-pulse" : "text-white"}>{metrics.audioQueueSize}</span>
                </div>

                <div className="flex justify-between">
                    <span className="opacity-70">Errors Encountered:</span>
                    <span className={metrics.errors > 0 ? "text-red-400 font-bold" : "text-white"}>{metrics.errors}</span>
                </div>

                <div className="mt-4 pt-4 border-t border-[#00ffcc]/30">
                    <div className="flex justify-between font-bold text-sm items-center">
                        <span className="opacity-90">Quiet Duration (Lag):</span>
                        <span className={lag > 2500 ? "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" : lag > 1000 ? "text-yellow-400" : "text-green-400"}>
                            {metrics.connected && metrics.lastPacketTime ? `${lag} ms` : "---"}
                        </span>
                    </div>
                    <div className="text-[10px] text-[#00ffcc]/50 mt-2 leading-relaxed">
                        * 'Quiet Duration' measures time since the server last sent data. High duration while speaking indicates server delay.
                    </div>
                </div>
            </div>
        </div>
    );
}
