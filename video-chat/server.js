import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  console.log("Подключен:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", socket.id);
  });

  socket.on("offer", ({ roomId, offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ roomId, answer, to }) => {
    io.to(to).emit("answer", { answer, from: socket.id });
  });

  socket.on("candidate", ({ roomId, candidate, to }) => {
    io.to(to).emit("candidate", { candidate, from: socket.id });
  });

  socket.on("chat-message", ({ roomId, message, name }) => {
    io.to(roomId).emit("chat-message", { name, message });
  });

  socket.on("disconnect", () => {
    io.emit("user-disconnected", socket.id);
  });
});

server.listen(3000, () => console.log("✅ Сервер запущен: http://localhost:3000"));
