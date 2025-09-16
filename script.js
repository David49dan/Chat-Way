console.log("Script loaded ✅");

// ================== GLOBAL DOM REFERENCES ==================
const chatList = document.getElementById("chatList");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");
const postBtn = document.getElementById("postBtn");
const audioBtn = document.getElementById("audioBtn");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

let activeChat = null;
let mediaRecorder;
let audioChunks = [];

// Store chats/messages
const chats = {
  john: [],
  mary: [],
  alex: []
};

// ================== AUTH HANDLING ==================

// ---- Registration ----
if (registerForm) {
  registerForm.addEventListener("submit", e => {
    e.preventDefault();

    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirm = document.getElementById("registerConfirm").value.trim();

    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    let users = JSON.parse(localStorage.getItem("users")) || [];

    if (users.find(u => u.email === email)) {
      alert("Email already registered!");
      return;
    }

    const user = { username, email, password };
    users.push(user);

    localStorage.setItem("users", JSON.stringify(users));

    alert("Registration successful! Please login.");
    window.location.href = "login.html";
  });
}

// ---- Login ----
if (loginForm) {
  loginForm.addEventListener("submit", e => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem("activeUser", JSON.stringify(user));
      alert("Login successful!");
      window.location.href = "chat.html";
    } else {
      alert("Invalid credentials!");
    }
  });
}

// ================== CHAT HANDLING ==================

// Create message HTML (WhatsApp style)
function createMessageHTML(type, content, sent = true) {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + (sent ? "sent" : "received");

  // content
  let msgContent = "";
  if (type === "text") {
    msgContent = `<div class="message-text">${content}</div>`;
  } else if (type === "image") {
    msgContent = `<div class="message-text"><img src="${content}" alt="image"></div>`;
  } else if (type === "video") {
    msgContent = `<div class="message-text"><video controls><source src="${content}" type="video/mp4"></video></div>`;
  } else if (type === "audio") {
    msgContent = `<div class="message-text"><audio controls src="${content}"></audio></div>`;
  } else if (type === "deleted") {
    msgContent = `<div class="message-text"><i>This message was deleted</i></div>`;
  }

  // meta info inside bubble
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const msgMeta = `
    <div class="message-meta">
      <span class="time">${time}</span>
      <span class="ticks">✔✔</span>
      <span class="delete-btn">Delete</span>
    </div>
  `;

  wrapper.innerHTML = msgContent + msgMeta;

  return wrapper.outerHTML;
}

// Load messages for chat
function loadMessages(chatId) {
  if (!messagesDiv) return; // prevent error on login/register page

  messagesDiv.innerHTML = "";
  chats[chatId].forEach(msgHTML => {
    const div = document.createElement("div");
    div.innerHTML = msgHTML;
    messagesDiv.appendChild(div.firstChild);
  });

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  attachDeleteHandlers();
}

// Select chat
if (chatList) {
  chatList.addEventListener("click", e => {
    if (e.target.tagName === "LI") {
      activeChat = e.target.dataset.chat;
      chatHeader.querySelector("span").textContent = e.target.textContent;
      loadMessages(activeChat);

      [...chatList.children].forEach(li => li.classList.remove("active"));
      e.target.classList.add("active");
    }
  });
}

// Send text message
if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    if (activeChat && messageInput.value.trim() !== "") {
      const msgHTML = createMessageHTML("text", messageInput.value.trim(), true);
      chats[activeChat].push(msgHTML);
      loadMessages(activeChat);
      messageInput.value = "";
    }
  });
}

// Handle media upload
if (fileInput) {
  fileInput.addEventListener("change", () => {
    if (activeChat && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = e => {
        let msgHTML = "";
        if (file.type.startsWith("image")) {
          msgHTML = createMessageHTML("image", e.target.result, true);
        } else if (file.type.startsWith("video")) {
          msgHTML = createMessageHTML("video", e.target.result, true);
        }
        chats[activeChat].push(msgHTML);
        loadMessages(activeChat);
      };

      reader.readAsDataURL(file);
      fileInput.value = "";
    }
  });
}

// Open file picker on post button
if (postBtn) {
  postBtn.addEventListener("click", () => {
    fileInput.click();
  });
}

// Audio recording
if (audioBtn) {
  audioBtn.addEventListener("mousedown", async () => {
    if (!navigator.mediaDevices) return alert("Audio recording not supported");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const audioURL = URL.createObjectURL(audioBlob);
      const msgHTML = createMessageHTML("audio", audioURL, true);
      chats[activeChat].push(msgHTML);
      loadMessages(activeChat);
    };

    mediaRecorder.start();
  });

  audioBtn.addEventListener("mouseup", () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  });
}

// Delete message handler
function attachDeleteHandlers() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = () => {
      const bubble = btn.closest(".message");
      if (bubble) {
        bubble.innerHTML = `<div class="message-text"><i>This message was deleted</i></div>`;
      }
    };
  });
}
// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("activeUser"); // clear session
    window.location.href = "login.html";   // redirect to login
  });
}

// ================== CAMERA CAPTURE ==================
const cameraBtn = document.getElementById("cameraBtn");

if (cameraBtn) {
  cameraBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      // Create a temporary popup
      const preview = document.createElement("div");
      preview.classList.add("camera-preview");
      preview.innerHTML = `
        <div class="camera-box">
          <button id="captureBtn">Capture</button>
          <button id="closeCameraBtn">Close</button>
        </div>
      `;
      preview.appendChild(video);
      document.body.appendChild(preview);

      // Capture image
      document.getElementById("captureBtn").onclick = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        const imgData = canvas.toDataURL("image/png");
        const msgHTML = createMessageHTML("image", imgData, true);
        chats[activeChat].push(msgHTML);
        loadMessages(activeChat);

        stream.getTracks().forEach(track => track.stop());
        preview.remove();
      };

      // Close camera
      document.getElementById("closeCameraBtn").onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        preview.remove();
      };

    } catch (err) {
      alert("Camera access denied or not available.");
      console.error(err);
    }
  });
}

// ================== VIDEO RECORDING ==================
const videoRecordBtn = document.getElementById("videoRecordBtn");
let videoRecorder;
let videoChunks = [];

if (videoRecordBtn) {
  videoRecordBtn.addEventListener("mousedown", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRecorder = new MediaRecorder(stream);
      videoChunks = [];

      videoRecorder.ondataavailable = e => {
        if (e.data.size > 0) videoChunks.push(e.data);
      };

      videoRecorder.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: "video/webm" });
        const videoURL = URL.createObjectURL(videoBlob);

        // Send video as chat message
        const msgHTML = createMessageHTML("video", videoURL, true);
        chats[activeChat].push(msgHTML);
        loadMessages(activeChat);

        // stop camera
        stream.getTracks().forEach(track => track.stop());
      };

      videoRecorder.start();
      alert("🎥 Recording started... Release button to stop");
    } catch (err) {
      console.error("Video recording error:", err);
      alert("Could not access camera.");
    }
  });

  videoRecordBtn.addEventListener("mouseup", () => {
    if (videoRecorder && videoRecorder.state !== "inactive") {
      videoRecorder.stop();
    }
  });
}

