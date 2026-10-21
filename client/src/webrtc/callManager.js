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
// Glare: the joiner offers to each peer already in the call (see join()),
// but anyone turning their camera on also re-offers to every peer (see
// enableVideo()) - so two offers can cross, e.g. both players switching
// their cameras on together. That's resolved with "perfect negotiation"
// (webrtc/negotiation.js): the polite side of each pair gives way and
// re-offers, the impolite side ignores the colliding offer.

import { getSocket } from "../net/socket.js";
import { isPolite, offerCollision, shouldIgnoreAnswer } from "./negotiation.js";
import { shouldPlayPeerMedia } from "./speakers.js";

// Used until (or if) the server's list arrives - see join().
const FALLBACK_ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

// Video: ask the camera for 720p, cap each outgoing stream's bitrate
// (mesh = one copy per peer, so 3 at a full 4-video table), and when
// bandwidth runs short drop frame rate before resolution - for showing
// cards/faces at a table, sharpness matters more than smooth motion.
// `ideal`, not `min`: a webcam that can't do 720p still works at its best.
const VIDEO_IDEAL = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
const VIDEO_MAX_BITRATE = 1_500_000; // bps per outgoing stream

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
 *   fetchIceServers?: () => Promise<RTCIceServer[]>,
 *   getUserId?: () => string,
 *   onRoleChanged?: (role: "speaker"|"spectator", speakerUserIds: Set<string>|null) => void,
 *   onRejoining?: () => void,
 *   onRejoined?: (result: { ok: boolean, role?: string, reason?: string }) => void,
 * }} handlers
 */
export function createCallManager(handlers) {
  const socket = getSocket();
  let iceServers = FALLBACK_ICE_SERVERS;
  const peers = new Map(); // peerId -> RTCPeerConnection
  const makingOffer = new Set(); // peerIds we're mid-createOffer/setLocalDescription with
  // Match tables (event day): our role in this call and who may speak -
  // see server/src/tournament/speakers.js. null speakers = no lock.
  let role = "speaker";
  let speakerUserIds = null;
  const peerUserIds = new Map(); // peerId (socket id) -> account id
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
    return selectedVideoDeviceId ? { ...VIDEO_IDEAL, deviceId: { exact: selectedVideoDeviceId } } : VIDEO_IDEAL;
  }

  /** Bitrate cap + keep-resolution preference on a video sender (best effort). */
  function tuneVideoSender(sender) {
    if (sender.track) sender.track.contentHint = "detail";
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    params.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
    params.degradationPreference = "maintain-resolution";
    sender.setParameters(params).catch(() => {
      // Not supported here / not negotiated yet - the browser's defaults apply.
    });
  }

  function addLocalTrack(pc, track) {
    const sender = pc.addTrack(track, localStream);
    if (track.kind === "video") tuneVideoSender(sender);
  }

  function attachLocalTracks(pc) {
    if (!localStream) return;
    for (const track of localStream.getTracks()) {
      addLocalTrack(pc, track);
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
    const pc = new RTCPeerConnection({ iceServers });

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
    makingOffer.delete(peerId);
    ignoringOfferFrom.delete(peerId);
    detachSpeakingDetector(peerId);
    handlers.onPeerStream?.(peerId, null);
  }

  // Sends a fresh offer on `pc` (new connection or added track).
  async function sendOffer(peerId, pc) {
    makingOffer.add(peerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call-signal", { to: peerId, data: { type: "offer", sdp: pc.localDescription } });
    } finally {
      makingOffer.delete(peerId);
    }
  }

  async function makeOfferTo(peerId) {
    const pc = createPeerConnection(peerId);
    // A spectator sends nothing - ask to receive their audio + video.
    if (role === "spectator") {
      pc.addTransceiver("audio", { direction: "recvonly" });
      pc.addTransceiver("video", { direction: "recvonly" });
    }
    await sendOffer(peerId, pc);
  }

  // Candidates for an offer we chose to ignore (impolite side of a
  // collision) will fail to apply - expected, so don't warn about them.
  const ignoringOfferFrom = new Set();

  async function handleSignal({ from, data }) {
    if (data.type === "offer") {
      const pc = peers.get(from) || createPeerConnection(from);
      const { collision, ignore } = offerCollision({
        polite: isPolite(socket.id, from),
        makingOffer: makingOffer.has(from),
        signalingState: pc.signalingState,
      });
      if (ignore) {
        ignoringOfferFrom.add(from);
        return;
      }
      ignoringOfferFrom.delete(from);
      // Polite side of a collision: setRemoteDescription rolls our own
      // pending offer back implicitly, then we answer theirs...
      await pc.setRemoteDescription(data.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call-signal", { to: from, data: { type: "answer", sdp: pc.localDescription } });
      // ...and re-send ours, so whatever we were adding (our camera)
      // still reaches them.
      if (collision) await sendOffer(from, pc);
    } else if (data.type === "answer") {
      const pc = peers.get(from);
      // A late answer to an offer we already rolled back - nothing to apply.
      if (!pc || shouldIgnoreAnswer(pc.signalingState)) return;
      await pc.setRemoteDescription(data.sdp);
    } else if (data.type === "candidate") {
      const pc = peers.get(from);
      if (!pc) return;
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (err) {
        if (!ignoringOfferFrom.has(from)) console.warn("[call] failed to add ICE candidate", err);
      }
    }
  }

  function handlePeerJoined(peer) {
    if (peer.userId) peerUserIds.set(peer.id, peer.userId);
    handlers.onPeerJoined?.(peer);
  }

  /** Whether a peer's audio/video should play here (match-table lock). */
  function canPlay(peerId) {
    return shouldPlayPeerMedia({ peerUserId: peerUserIds.get(peerId), speakerUserIds });
  }

  // The table's lock changed (a round started or ended). If our own role
  // flips, rejoin so the server and every peer see the new role.
  async function handleTableLock({ speakerUserIds: ids }) {
    if (!inCall) return;
    speakerUserIds = ids ? new Set(ids) : null;
    const nextRole = !speakerUserIds || speakerUserIds.has(handlers.getUserId?.()) ? "speaker" : "spectator";
    handlers.onRoleChanged?.(nextRole, speakerUserIds);
    if (nextRole !== role) {
      // Tell the UI first so it drops the old tiles / camera state, then
      // whether getting back in worked (e.g. the spectator seats are full).
      handlers.onRejoining?.();
      leave();
      handlers.onRejoined?.(await join());
    }
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
  socket.on("table-lock", handleTableLock);

  function emitAck(event, payload) {
    return new Promise((resolve) => socket.emit(event, payload, resolve));
  }

  function stopLocalStream() {
    localStream?.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  async function join() {
    if (inCall) return { ok: true };

    // STUN/TURN list from the server (TURN credentials are short-lived,
    // so fetched per call). Any failure keeps the STUN-only fallback.
    try {
      const fetched = await handlers.fetchIceServers?.();
      if (Array.isArray(fetched) && fetched.length) iceServers = fetched;
    } catch {
      iceServers = FALLBACK_ICE_SERVERS;
    }

    // Ask the server first: at a match table it decides whether we speak
    // or only watch - a spectator never opens the mic at all.
    const ack = await emitAck("join-call", {});
    if (!ack?.ok) {
      handlers.onError?.(callErrorMessage(ack?.reason));
      return ack || { ok: false, reason: "unknown" };
    }
    role = ack.role === "spectator" ? "spectator" : "speaker";
    speakerUserIds = ack.speakerUserIds ? new Set(ack.speakerUserIds) : null;

    if (role === "speaker") {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints() });
      } catch {
        socket.emit("leave-call");
        handlers.onError?.("Couldn't access your microphone - check the browser's permission prompt.");
        return { ok: false, reason: "media-denied" };
      }
    } else {
      localStream = new MediaStream();
    }

    inCall = true;
    handlers.onRoleChanged?.(role, speakerUserIds);
    handlers.onLocalStream?.(localStream);
    attachSpeakingDetector("local", localStream);

    // Dial every existing member - the joiner offers (see negotiation.js
    // for when two offers cross anyway).
    for (const peer of ack.peers) {
      handlePeerJoined(peer);
      if (peer.videoOn) handlers.onPeerVideoChanged?.(peer.id, true);
      if (peer.micMuted) handlers.onPeerMicChanged?.(peer.id, true);
      if (peer.deafened) handlers.onPeerDeafenChanged?.(peer.id, true);
      await makeOfferTo(peer.id);
    }

    return { ok: true, role };
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
    role = "speaker";
    speakerUserIds = null;
    peerUserIds.clear();
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
      addLocalTrack(pc, videoTrack);
      await sendOffer(peerId, pc);
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
      if (sender) {
        await sender.replaceTrack(newTrack);
        tuneVideoSender(sender);
      }
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
    socket.off("table-lock", handleTableLock);
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
    getRole: () => role,
    canPlay,
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
    case "spectators-full":
      return "This match already has the most spectators it can take (8).";
    case "spectator":
      return "This table is in a match - only the players and staff can use mic and camera.";
    default:
      return "Something went wrong with the call - try again.";
  }
}
