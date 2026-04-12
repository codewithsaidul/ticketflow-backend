/* eslint-disable no-console */
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
// import { metricsMiddleware } from "./app/middleware/metricsMiddleware";
import "./app/config/passport";
import cron from "node-cron";
import { BookingService } from "./app/modules/booking/booking.service";

const app: Application = express();


app.use(helmet()); 
app.use(morgan("dev"));


app.use(
  cors({
    origin: [envVars.FRONTEND_URL, envVars.LOCAL_FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());


app.use(
  expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: envVars.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());


app.set("trust proxy", 1);
// app.use(metricsMiddleware);


// Schedule a task to run every minute
cron.schedule("* * * * *", () => {
  try {
    BookingService.cancelUnpaidExpiredBookings();
    console.log("Running a task every minute: Checking for EXPIRED Bookings.");
  } catch (error) {
    console.log("🚀 CRON JOB ERROR:", error);
  }
})


app.use("/api/v1", router);


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