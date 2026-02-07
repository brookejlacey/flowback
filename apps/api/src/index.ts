import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import { authRouter } from "./routes/auth";
import { metricsRouter } from "./routes/metrics";
import { campaignRouter } from "./routes/campaigns";
import { submissionRouter } from "./routes/submissions";
import { platformRouter } from "./routes/platforms";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// Routes
app.use("/auth", authRouter);
app.use("/api/metrics", metricsRouter);
app.use("/campaigns", campaignRouter);
app.use("/submissions", submissionRouter);
app.use("/platforms", platformRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`FlowBack API running on port ${PORT}`);
});
