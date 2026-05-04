export type CallType = "voice" | "video" | null;
export type CallState = "idle" | "calling" | "ringing" | "active" | "ended";

export interface CallSession {
  id: string;
  peerId: string;
  type: CallType;
  state: CallState;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  startTime?: Date;
  peerConnection?: RTCPeerConnection;
}

export class CallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onStateChangeCallback: ((state: CallState) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  private iceServers = [
    { urls: ["stun:stun.l.google.com:19302"] },
    { urls: ["stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302"] },
  ];

  async requestMediaAccess(audio: boolean, video: boolean): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (err) {
      const error = `Media access denied: ${err instanceof Error ? err.message : "Unknown error"}`;
      this.onErrorCallback?.(error);
      throw err;
    }
  }

  async initiateCall(callType: "voice" | "video"): Promise<RTCSessionDescription> {
    try {
      const audio = true;
      const video = callType === "video";

      await this.requestMediaAccess(audio, video);

      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      this.setupPeerConnectionListeners();

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.onStateChangeCallback?.("calling");

      return offer;
    } catch (err) {
      this.onErrorCallback?.(
        `Failed to initiate call: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      throw err;
    }
  }

  async answerCall(offer: RTCSessionDescriptionInit, callType: "voice" | "video"): Promise<RTCSessionDescriptionInit> {
    try {
      const audio = true;
      const video = callType === "video";

      await this.requestMediaAccess(audio, video);

      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      this.setupPeerConnectionListeners();

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.onStateChangeCallback?.("ringing");

      return answer;
    } catch (err) {
      this.onErrorCallback?.(
        `Failed to answer call: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      throw err;
    }
  }

  async handleRemoteAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    } catch (err) {
      this.onErrorCallback?.(
        `Failed to handle remote answer: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      throw err;
    }
  }

  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(candidate);
      }
    } catch (err) {
      console.warn("Failed to add ICE candidate:", err);
    }
  }

  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.onRemoteStreamCallback?.(this.remoteStream);
      this.onStateChangeCallback?.("active");
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === "connected") {
        this.onStateChangeCallback?.("active");
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        this.onStateChangeCallback?.("ended");
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
    };
  }

  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.onRemoteStreamCallback = callback;
  }

  onStateChange(callback: (state: CallState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getIceCandidates(
    callback: (candidate: RTCIceCandidate | null) => void
  ): void {
    if (!this.peerConnection) return;
    this.peerConnection.onicecandidate = (event) => {
      callback(event.candidate);
    };
  }

  endCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection && this.peerConnection.signalingState !== "closed") {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.dataChannel = null;
    this.onStateChangeCallback?.("ended");
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }
}
