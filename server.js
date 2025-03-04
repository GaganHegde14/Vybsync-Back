const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://vybsync.vercel.app",
    credentials: true,
  },
});

const connectDB = require("./config/db");
const passport = require("./config/passport");
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const messageRoutes = require("./routes/messageRoutes")(io);
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

connectDB();

app.use(express.json());
app.use(cors({ origin: "https://vybsync.vercel.app", credentials: true }));

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use(notFound);
app.use(errorHandler);

app.get("/", (req, res) => {
  res.send("Hello new user welcome to VybSync");
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  socket.on("typing", ({ userId, chatId }) => {
    socket.to(chatId).emit("userTyping", { userId, chatId });
  });

  socket.on("stopTyping", ({ userId, chatId }) => {
    socket.to(chatId).emit("userStoppedTyping", { userId, chatId });
  });

  socket.on("newMessage", (message) => {
    console.log("New message received:", message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
