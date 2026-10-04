// Mesh WebRTC voice/video for one table's call. One RTCPeerConnection is
// opened directly to each other peer at the table (no media server) -
// signaling (who's here, SDP offers/answers, ICE candidates) is relayed
// through the existing Socket.io connection (see server/src/index.js's
// "Voice/video calls" section). The server never touches actual audio/
// video, only these small signaling messages.
//
// Capacity (10 voice / 4 video per table - see README) is enforced
// server-side; this module just surfaces the resulting ok/reason back to
// the caller so the UI can show why a join/enable-video was refused.
//
// Glare avoidance: only the *joiner* ever creates an SDP offer, toward
// each peer already in the call (see join()). An existing member only
// ever answers. This means two sides never simultaneously try to offer
// each other, so there's no need for perfect-negotiation/rollback logic.

import { getSocket } from "../net/socket.js";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

/**
 * @param {{
 *   onLocalStream?: (stream: MediaStream) => void,
 *   onPeerJoined?: (peer: {id: string, name: string}) => void,
 *   onPeerLeft?: (peerId: string) => void,
 *   onPeerStream?: (peerId: string, stream: MediaStream | null) => void,
 *   onPeerVideoChanged?: (peerId: string, videoOn: boolean) => void,
 *   onPeerMicChanged?: (peerId: string, micMuted: boolean) => void,
 *   onPeerDeafenChanged?: (peerId: string, deafened: boolean) => void,
 *   onMicAutoMuted?: (micMuted: boolean) => void,
 *   onSpeakingChanged?: (id: string, speaking: boolean) => void,
 *   onError?: (message: string) => void,
 * }} handlers
 */
export function createCallManager(handlers) {
  const socket = getSocket();
  const peers = new Map(); // peerId -> RTCPeerConnection
  const speakingDetectors = new Map(); // "local" | peerId -> detector state

  let localStream = null;
  let inCall = false;
  let videoOn = false;
  let micMuted = false;
  let deafened = false;
  // Was the mic muted *by* deafen() rather than by the user directly? If
  // so, undeafen() restores it - but a mute the user already had going
  // into deafen() (or set manually afterward) should stick regardless.
  let mutedByDeafen = false;
  let audioContext = null;
  // Device picker (ui/call.js) - remembered here so it applies the next
  // time join()/enableVideo() runs, and also used live mid-call (see
  // setAudioDevice/setVideoDevice below, which swap the outgoing track
  // via RTCRtpSender.replaceTrack instead of a full renegotiation).
  let selectedAudioDeviceId = null;
  let selectedVideoDeviceId = null;

  function audioConstraints() {
    return selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true;
  }

  function videoConstraints() {
    return selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true;
  }

  function attachLocalTracks(pc) {
    if (!localStream) return;
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  // Lightweight voice-activity detection purely on this client, from
  // whatever audio it already has (no extra signaling) - taps each
  // stream with a Web Audio analyser and watches its volume cross a
  // threshold, with a short hold so a "speaking" ring doesn't flicker
  // between words. Never connected to audioContext.destination, so it
  // only reads the stream - playback still happens through the <video>
  // elements in ui/call.js exactly as before.
  const SPEAKING_THRESHOLD = 14; // getByteFrequencyData is 0-255
  const SPEAKING_HOLD_MS = 350;

  function getAudioContext() {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioContext = new Ctor();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  }

  function attachSpeakingDetector(id, stream) {
    if (!stream?.getAudioTracks().length) return;
    const existing = speakingDetectors.get(id);
    if (existing && existing.stream === stream) return; // already watching this exact stream
    detachSpeakingDetector(id);

    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      let speaking = false;
      let lastAboveAt = 0;
      const timer = setInterval(() => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        const now = performance.now();
        if (avg > SPEAKING_THRESHOLD) lastAboveAt = now;
        const nowSpeaking = now - lastAboveAt < SPEAKING_HOLD_MS;
        if (nowSpeaking !== speaking) {
          speaking = nowSpeaking;
          handlers.onSpeakingChanged?.(id, speaking);
        }
      }, 100);

      speakingDetectors.set(id, { source, timer, stream });
    } catch (err) {
      console.warn("[call] speaking detector failed to attach", err);
    }
  }

  function detachSpeakingDetector(id) {
    const detector = speakingDetectors.get(id);
    if (!detector) return;
    clearInterval(detector.timer);
    try {
      detector.source.disconnect();
    } catch {
      // already disconnected - nothing to do
    }
    speakingDetectors.delete(id);
    handlers.onSpeakingChanged?.(id, false);
  }

  function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("call-signal", {
          to: peerId,
          data: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      handlers.onPeerStream?.(peerId, stream);
      attachSpeakingDetector(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      // "disconnected" can recover on its own (a brief network hiccup) -
      // only tear the connection down on a state that means it's done
      // for good, so we don't drop someone over a momentary blip.
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closePeer(peerId);
      }
    };

    attachLocalTracks(pc);
    peers.set(peerId, pc);
    return pc;
  }

  function closePeer(peerId) {
    const pc = peers.get(peerId);
    if (!pc) return;
    pc.close();
    peers.delete(peerId);
    detachSpeakingDetector(peerId);
    handlers.onPeerStream?.(peerId, null);
  }

  async function makeOfferTo(peerId) {
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("call-signal", { to: peerId, data: { type: "offer", sdp: offer } });
  }

  async function handleSignal({ from, data }) {
    if (data.type === "offer") {
      const pc = peers.get(from) || createPeerConnection(from);
      await pc.setRemoteDescription(data.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call-signal", { to: from, data: { type: "answer", sdp: answer } });
    } else if (data.type === "answer") {
      const pc = peers.get(from);
      if (pc) await pc.setRemoteDescription(data.sdp);
    } else if (data.type === "candidate") {
      const pc = peers.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (err) {
        console.warn("[call] failed to add ICE candidate", err);
      }
    }
  }

  function handlePeerJoined(peer) {
    handlers.onPeerJoined?.(peer);
  }

  function handlePeerLeft({ id }) {
    closePeer(id);
    handlers.onPeerLeft?.(id);
  }

  function handlePeerVideoOn({ id }) {
    handlers.onPeerVideoChanged?.(id, true);
  }

  function handlePeerVideoOff({ id }) {
    handlers.onPeerVideoChanged?.(id, false);
  }

  function handlePeerMicMuted({ id }) {
    handlers.onPeerMicChanged?.(id, true);
  }

  function handlePeerMicUnmuted({ id }) {
    handlers.onPeerMicChanged?.(id, false);
  }

  function handlePeerDeafened({ id }) {
    handlers.onPeerDeafenChanged?.(id, true);
  }

  function handlePeerUndeafened({ id }) {
    handlers.onPeerDeafenChanged?.(id, false);
  }

  socket.on("call-signal", handleSignal);
  socket.on("call-peer-joined", handlePeerJoined);
  socket.on("call-peer-left", handlePeerLeft);
  socket.on("call-peer-video-on", handlePeerVideoOn);
  socket.on("call-peer-video-off", handlePeerVideoOff);
  socket.on("call-peer-mic-muted", handlePeerMicMuted);
  socket.on("call-peer-mic-unmuted", handlePeerMicUnmuted);
  socket.on("call-peer-deafened", handlePeerDeafened);
  socket.on("call-peer-undeafened", handlePeerUndeafened);

  function emitAck(event, payload) {
    return new Promise((resolve) => socket.emit(event, payload, resolve));
  }

  function stopLocalStream() {
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  async function join() {
    if (inCall) return { ok: true };

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
    } catch {
      handlers.onError?.("Couldn't access your microphone - check the browser's permission prompt.");
      return { ok: false, reason: "media-denied" };
    }

    const ack = await emitAck("join-call", {});
    if (!ack?.ok) {
      stopLocalStream();
      handlers.onError?.(callErrorMessage(ack?.reason));
      return ack || { ok: false, reason: "unknown" };
    }

    inCall = true;
    handlers.onLocalStream?.(localStream);
    attachSpeakingDetector("local", localStream);

    // Dial every existing member - see the module comment for why only
    // the joiner ever creates offers.
    for (const peer of ack.peers) {
      handlers.onPeerJoined?.(peer);
      if (peer.videoOn) handlers.onPeerVideoChanged?.(peer.id, true);
      if (peer.micMuted) handlers.onPeerMicChanged?.(peer.id, true);
      if (peer.deafened) handlers.onPeerDeafenChanged?.(peer.id, true);
      await makeOfferTo(peer.id);
    }

    return { ok: true };
  }

  function leave() {
    if (!inCall) return;
    socket.emit("leave-call");
    for (const peerId of Array.from(peers.keys())) closePeer(peerId);
    detachSpeakingDetector("local");
    stopLocalStream();
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
    inCall = false;
    videoOn = false;
    micMuted = false;
    deafened = false;
    mutedByDeafen = false;
  }

  // Mutes/unmutes the outgoing mic track directly (no renegotiation
  // needed - toggling MediaStreamTrack.enabled just stops/resumes that
  // track's data without touching the peer connections) and tells the
  // table so everyone else's tile can show the muted badge.
  function muteMic() {
    if (!inCall || micMuted) return;
    const track = localStream?.getAudioTracks()[0];
    if (track) track.enabled = false;
    micMuted = true;
    socket.emit("mute-mic");
  }

  function unmuteMic() {
    if (!inCall || !micMuted) return;
    const track = localStream?.getAudioTracks()[0];
    if (track) track.enabled = true;
    micMuted = false;
    mutedByDeafen = false;
    socket.emit("unmute-mic");
  }

  // Deafen only affects what *this* client hears (ui/call.js mutes the
  // rendered <video>/<audio> elements) - the server round-trip here is
  // just so everyone else sees the status badge, same as Discord.
  function deafen() {
    if (!inCall || deafened) return;
    deafened = true;
    socket.emit("deafen");
    if (!micMuted) {
      mutedByDeafen = true;
      const track = localStream?.getAudioTracks()[0];
      if (track) track.enabled = false;
      micMuted = true;
      socket.emit("mute-mic");
      handlers.onMicAutoMuted?.(true);
    }
  }

  function undeafen() {
    if (!inCall || !deafened) return;
    deafened = false;
    socket.emit("undeafen");
    if (mutedByDeafen) {
      mutedByDeafen = false;
      const track = localStream?.getAudioTracks()[0];
      if (track) track.enabled = true;
      micMuted = false;
      socket.emit("unmute-mic");
      handlers.onMicAutoMuted?.(false);
    }
  }

  async function enableVideo() {
    if (!inCall || videoOn) return { ok: false };

    let videoStream;
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
    } catch {
      handlers.onError?.("Couldn't access your camera - check the browser's permission prompt.");
      return { ok: false, reason: "media-denied" };
    }

    const ack = await emitAck("enable-video", {});
    if (!ack?.ok) {
      videoStream.getTracks().forEach((t) => t.stop());
      handlers.onError?.(callErrorMessage(ack?.reason));
      return ack || { ok: false, reason: "unknown" };
    }

    const [videoTrack] = videoStream.getTracks();
    localStream.addTrack(videoTrack);
    videoOn = true;
    handlers.onLocalStream?.(localStream);

    // Renegotiate every existing peer connection so they start receiving
    // the new video track too.
    for (const [peerId, pc] of peers) {
      pc.addTrack(videoTrack, localStream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call-signal", { to: peerId, data: { type: "offer", sdp: offer } });
    }

    return { ok: true };
  }

  function disableVideo() {
    if (!videoOn) return;
    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      for (const pc of peers.values()) {
        const sender = pc.getSenders().find((s) => s.track === videoTrack);
        if (sender) pc.removeTrack(sender);
      }
    }
    videoOn = false;
    socket.emit("disable-video");
    handlers.onLocalStream?.(localStream);
  }

  // Live mic swap: grabs a fresh stream from the newly-picked device,
  // replaces the track on the local stream and on every peer connection
  // via replaceTrack (no SDP renegotiation, no dropped connection), and
  // re-attaches the speaking detector to the new track. If not in a call
  // yet, this just remembers the choice for the next join().
  async function setAudioDevice(deviceId) {
    selectedAudioDeviceId = deviceId || null;
    if (!inCall || !localStream) return;

    let newStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
    } catch (err) {
      console.warn("[call] couldn't switch microphone", err);
      handlers.onError?.("Couldn't switch to that microphone.");
      return;
    }

    const [newTrack] = newStream.getAudioTracks();
    const oldTrack = localStream.getAudioTracks()[0];
    newTrack.enabled = !micMuted; // carry the current mute state over

    localStream.removeTrack(oldTrack);
    localStream.addTrack(newTrack);
    oldTrack.stop();

    for (const pc of peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) await sender.replaceTrack(newTrack);
    }

    // Re-attach rather than rely on the stream-identity check in
    // attachSpeakingDetector - localStream is the same object, just with
    // a swapped track, and a Web Audio source node doesn't follow that
    // swap on its own.
    detachSpeakingDetector("local");
    attachSpeakingDetector("local", localStream);
    handlers.onLocalStream?.(localStream);
  }

  // Same idea as setAudioDevice, for the camera - only takes effect
  // immediately if video is currently on; otherwise it's just
  // remembered for the next enableVideo().
  async function setVideoDevice(deviceId) {
    selectedVideoDeviceId = deviceId || null;
    if (!inCall || !videoOn || !localStream) return;

    let newStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
    } catch (err) {
      console.warn("[call] couldn't switch camera", err);
      handlers.onError?.("Couldn't switch to that camera.");
      return;
    }

    const [newTrack] = newStream.getVideoTracks();
    const oldTrack = localStream.getVideoTracks()[0];
    localStream.removeTrack(oldTrack);
    localStream.addTrack(newTrack);
    oldTrack.stop();

    for (const pc of peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
    }

    handlers.onLocalStream?.(localStream);
  }

  function destroy() {
    leave();
    socket.off("call-signal", handleSignal);
    socket.off("call-peer-joined", handlePeerJoined);
    socket.off("call-peer-left", handlePeerLeft);
    socket.off("call-peer-video-on", handlePeerVideoOn);
    socket.off("call-peer-video-off", handlePeerVideoOff);
    socket.off("call-peer-mic-muted", handlePeerMicMuted);
    socket.off("call-peer-mic-unmuted", handlePeerMicUnmuted);
    socket.off("call-peer-deafened", handlePeerDeafened);
    socket.off("call-peer-undeafened", handlePeerUndeafened);
  }

  return {
    join,
    leave,
    enableVideo,
    disableVideo,
    muteMic,
    unmuteMic,
    deafen,
    undeafen,
    setAudioDevice,
    setVideoDevice,
    destroy,
    isInCall: () => inCall,
    isVideoOn: () => videoOn,
    isMicMuted: () => micMuted,
    isDeafened: () => deafened,
  };
}

function callErrorMessage(reason) {
  switch (reason) {
    case "voice-full":
      return "This table's voice call is full (max 10).";
    case "video-full":
      return "Camera slots at this table are full (max 4) - you can still talk.";
    case "not-seated":
      return "Walk up to a table first.";
    case "not-in-call":
      return "Join the call before turning on your camera.";
    default:
      return "Something went wrong with the call - try again.";
  }
}
