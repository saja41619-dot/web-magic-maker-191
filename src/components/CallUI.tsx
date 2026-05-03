import { useEffect, useRef, useState } from "react";
import {
  Phone,
  VideoIcon,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Grid,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallUIProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: "voice" | "video";
  callDuration: number;
  onEndCall: () => void;
  onToggleMic: (enabled: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  peerName?: string;
}

export function CallUI({
  localStream,
  remoteStream,
  callType,
  callDuration,
  onEndCall,
  onToggleMic,
  onToggleVideo,
  peerName = "User",
}: CallUIProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === "video");
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [layout, setLayout] = useState<"pip" | "grid">("pip");

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

  const toggleMic = () => {
    const newState = !micEnabled;
    setMicEnabled(newState);
    onToggleMic(newState);
  };

  const toggleVideo = () => {
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    onToggleVideo(newState);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (callType === "voice") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl bg-gradient-to-br from-card to-card/80 shadow-2xl p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{peerName}</h2>
            <p className="text-lg font-mono text-primary">{formatDuration(callDuration)}</p>
            <p className="text-sm text-muted-foreground">Voice call in progress...</p>
          </div>

          <div className="relative h-24 w-24 mx-auto">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-primary/40 animate-pulse [animation-delay:0.15s]" />
            <div className="relative h-full w-full rounded-full bg-gradient-primary flex items-center justify-center">
              <Mic className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={toggleMic}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-all",
                micEnabled
                  ? "bg-secondary hover:bg-secondary/80"
                  : "bg-destructive hover:bg-destructive/90"
              )}
            >
              {micEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => setSpeakerEnabled(!speakerEnabled)}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full transition-all",
                speakerEnabled
                  ? "bg-secondary hover:bg-secondary/80"
                  : "bg-destructive hover:bg-destructive/90"
              )}
            >
              {speakerEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onEndCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive hover:bg-destructive/90 transition-all shadow-lg"
            >
              <PhoneOff className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Video call UI
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* Remote Video (Full screen) */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <div className="text-center space-y-3">
              <div className="relative h-20 w-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-primary/40 animate-pulse [animation-delay:0.15s]" />
                <div className="relative h-full w-full rounded-full bg-gradient-primary flex items-center justify-center">
                  <VideoIcon className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <p className="text-white/70">Connecting...</p>
            </div>
          </div>
        )}

        {/* Local Video (PiP) */}
        {layout === "pip" && localStream && (
          <div className="absolute bottom-4 right-4 w-32 h-32 rounded-lg overflow-hidden border-4 border-white/20 shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Grid Layout */}
        {layout === "grid" && (
          <div className="absolute inset-0 grid grid-cols-2 gap-2 p-2">
            <div className="rounded-lg overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-lg overflow-hidden bg-black border-2 border-white/20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="bg-black/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-white font-semibold">{peerName}</h2>
          <p className="text-xs text-white/60 font-mono">{formatDuration(callDuration)}</p>
        </div>
        <button
          onClick={() => setLayout(layout === "pip" ? "grid" : "pip")}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Toggle layout"
        >
          <Grid className="h-5 w-5" />
        </button>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-t from-black via-black/80 to-transparent px-6 py-6 flex items-center justify-center gap-4">
        <button
          onClick={toggleMic}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg",
            micEnabled
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-destructive hover:bg-destructive/90"
          )}
          title={micEnabled ? "Mute" : "Unmute"}
        >
          {micEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full transition-all shadow-lg",
            videoEnabled
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-destructive hover:bg-destructive/90"
          )}
          title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={onEndCall}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive hover:bg-destructive/90 transition-all shadow-lg"
          title="End call"
        >
          <PhoneOff className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}
