const socket = io();
const roomId = prompt("Введите ID комнаты (например: test123):");
const peers = {};
let localStream;

const videoContainer = document.getElementById("videos");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const localVideo = document.createElement("video");
  localVideo.srcObject = localStream;
  localVideo.autoplay = true;
  localVideo.muted = true;
  videoContainer.appendChild(localVideo);

  socket.emit("join-room", roomId);
}
init();

socket.on("user-joined", async (userId) => {
  console.log("➡️ Новый пользователь:", userId);
  const pc = createPeerConnection(userId);
  peers[userId] = pc;

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit("offer", { roomId, offer, to: userId });
});

socket.on("offer", async ({ from, offer }) => {
  const pc = createPeerConnection(from);
  peers[from] = pc;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit("answer", { roomId, answer, to: from });
});

socket.on("answer", async ({ from, answer }) => {
  await peers[from].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", async ({ from, candidate }) => {
  try {
    await peers[from].addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Ошибка ICE:", err);
  }
});

socket.on("user-disconnected", (id) => {
  if (peers[id]) {
    peers[id].close();
    delete peers[id];
    const vid = document.getElementById(id);
    if (vid) vid.remove();
  }
});

// ==== RTC ====

function createPeerConnection(userId) {
  const pc = new RTCPeerConnection();

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", { roomId, candidate: event.candidate, to: userId });
    }
  };

  pc.ontrack = (event) => {
    let remoteVideo = document.getElementById(userId);
    if (!remoteVideo) {
      remoteVideo = document.createElement("video");
      remoteVideo.id = userId;
      remoteVideo.autoplay = true;
      remoteVideo.srcObject = event.streams[0];
      videoContainer.appendChild(remoteVideo);
    }
  };

  return pc;
}

// ==== Чат ====

msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && msgInput.value.trim()) {
    socket.emit("chat-message", { roomId, message: msgInput.value, name: "Вы" });
    addMessage("Вы", msgInput.value);
    msgInput.value = "";
  }
});

socket.on("chat-message", ({ name, message }) => {
  addMessage(name, message);
});

function addMessage(name, message) {
  const div = document.createElement("div");
  div.textContent = `${name}: ${message}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
