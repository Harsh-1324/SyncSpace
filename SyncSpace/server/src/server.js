require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { Server } = require("socket.io");
const prisma = require("./config/prisma");
const authRoutes = require("./routes/authRoutes");

const app = express();
const server = http.createServer(app);

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(morgan("dev"));

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to SyncSpace API",
    status: "Running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "SyncSpace Backend",
  });
});

app.use("/api/auth", authRoutes);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found.",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();

    server.listen(PORT, () => {
      console.log(`SyncSpace server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database:", error.message);
    process.exit(1);
  }
}

async function shutdown() {
  console.log("Shutting down SyncSpace server...");

  io.close();

  await prisma.$disconnect();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();