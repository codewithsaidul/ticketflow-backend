import cors from "cors";
import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import passport from "passport";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import { router } from "./app/routes/index.route";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { envVars } from "./app/config/env";
import { notFound } from "./app/middleware/notFount";
import { metricsMiddleware } from "./app/middleware/metricsMiddleware";
import "./app/config/passport";

const app: Application = express();

// 1. Security & Logging (সবার আগে)
app.use(helmet()); // HTTP Headers সিকিউর করে
app.use(morgan("dev")); // কনসোলে লগ দেখাবে (GET /api/v1/users 200 45ms)

// 2. CORS Setup
app.use(
  cors({
    origin: [envVars.FRONTEND_URL, envVars.LOCAL_FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 3. Body Parsers & Compression
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ফর্ম ডাটা হ্যান্ডেল করার জন্য
app.use(cookieParser());
app.use(compression());

// 4. Session & Auth
app.use(
  expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: envVars.NODE_ENV === "production", // প্রোডাকশনে true হতে হবে
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// 5. Proxy & Metrics
app.set("trust proxy", 1);
app.use(metricsMiddleware);

// 6. Routes
app.use("/api/v1", router);

// Root Route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to The Biggest Ticketing System Server - TicketFlow!",
    version: "1.0.0",
    status: "Running",
  });
});

// 7. Error Handling (সবার শেষে)
app.use(globalErrorHandler);
app.use(notFound);

export default app;