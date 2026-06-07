import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  User,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CallType } from "@/lib/callManager";

interface CallUIProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: CallType;
  callDuration: number;
  onEndCall: () => void;
  onToggleMic: (enabled: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  onToggleHold?: (held: boolean) => void;
  peerName: string;
}

export function CallUI({
  localStream,
  remoteStream,
  callType,
  callDuration,
  onEndCall,
  onToggleMic,
  onToggleVideo,
  onToggleHold,
  peerName,
}: CallUIProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    onToggleMic(next);
  };

  const handleToggleVideo = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    onToggleVideo(next);
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-all duration-500",
      isFullscreen ? "p-0" : "p-4 md:p-10"
    )}>
      <div className={cn(
        "relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-card shadow-2xl transition-all duration-500",
        isFullscreen ? "rounded-none" : "rounded-3xl border border-border"
      )}>
        {/* Remote Video (Main) */}
        <div className="relative flex-1 bg-black">
          {callType === "video" && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-primary text-5xl font-bold text-white shadow-glow animate-pulse">
                  {peerName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-background border-4 border-black text-primary">
                   <User className="h-5 w-5" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white">{peerName}</h2>
                <p className="mt-2 text-primary animate-pulse font-medium">
                  {remoteStream ? "Connected" : "Calling..."}
                </p>
              </div>
            </div>
          )}

          {/* Local Video (PIP) */}
          {callType === "video" && localStream && (
            <div className="absolute right-6 top-6 h-32 w-24 overflow-hidden rounded-xl border-2 border-white/20 bg-black shadow-lg md:h-48 md:w-36">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn("h-full w-full object-cover", !videoEnabled && "hidden")}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-card/50 px-6 py-8 backdrop-blur-md">
          <div className="mx-auto flex max-w-sm items-center justify-center gap-6 md:gap-10">
            <button
              onClick={handleToggleMic}
              className={cn("h-14 w-14 rounded-full flex items-center justify-center transition-all", micEnabled ? "bg-secondary" : "bg-destructive text-white")}
            >
              {micEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>
            <button
              onClick={onEndCall}
              className="h-16 w-16 rounded-full bg-destructive text-white shadow-lg flex items-center justify-center"
            >
              <PhoneOff className="h-8 w-8" />
            </button>
            {callType === "video" && (
              <button onClick={handleToggleVideo} className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center">
                {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}