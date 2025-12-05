/* eslint-disable no-console */
import http from "http";
import mongoose from "mongoose";
import { Server as SocketIoServer } from "socket.io";
import app from "./app";
import { envVars } from "./app/config/env";
import { seedSuperAdmin } from "./app/utils/seedSuperAdmin";

let server: http.Server;
export let io: SocketIoServer;
const port = envVars.PORT;

const startServer = async () => {
  try {
    await mongoose.connect(`${envVars.DATABASE_URL}`);
    console.log("✅ MongoDB Connected Successfully");

    // await connectRedis();
    // console.log("✅ Redis Connected Successfully");

    await seedSuperAdmin();

    server = http.createServer(app);

    io = new SocketIoServer(server, {
      cors: {
        origin: [envVars.FRONTEND_URL, envVars.LOCAL_FRONTEND_URL],
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      socket.on("join_ticket_room", (ticketId) => {
        socket.join(ticketId);
        console.log(`User ${socket.id} joined room: ${ticketId}`);
      });

      socket.on("client-locking-seat", (data) => {
        // সাথে সাথে ওই ইভেন্ট রুমের সবাইকে জানিয়ে দেওয়া (ডাটাবেস আপডেট ছাড়াই)
        socket.to(data.eventId).emit("seat-optimistic-lock", {
          seatIds: data.seatIds,
          lockerId: data.userId,
        });
      });

      socket.on("disconnect", () => {
        console.log(`❌ User disconnected: ${socket.id}`);
      });
    });

    server.listen(port, () => {
      console.log(
        `🚀 Biggest Ever Ticketing System - TicketFlow Server running on port ${port}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (server) {
    server.close(() => {
      console.log("✅ Server closed.");
      // Disconnect DBs if needed (Good Practice)
      mongoose.connection.close(false).then(() => {
        console.log("✅ MongoDB connection closed.");
        process.exit(0); // Success Exit
      });
    });
  } else {
    process.exit(0);
  }
};

// Handle Termination Signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle Uncaught Errors
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  // For unhandled rejection, we exit with error code 1
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
