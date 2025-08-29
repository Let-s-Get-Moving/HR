import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { q } from "./db.js";

import employees from "./routes/employees.js";
import auth from "./routes/auth.js";
import payroll from "./routes/payroll.js";
import compliance from "./routes/compliance.js";
import leave from "./routes/leave.js";
import performance from "./routes/performance.js";
import analytics from "./routes/analytics.js";
import metrics from "./routes/metrics.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// Simple test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is working" });
});

// Test route
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await q("SELECT COUNT(*) FROM leave_requests");
    res.json({ count: result.rows[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test analytics route
app.get("/api/analytics/test", (req, res) => {
  res.json({ message: "Analytics test route is working" });
});

app.use("/api/auth", auth);
app.use("/api/employees", employees);
app.use("/api/payroll", payroll);
app.use("/api/compliance", compliance);
app.use("/api/leave", leave);
app.use("/api/performance", performance);
app.use("/api/analytics", analytics);
app.use("/api/metrics", metrics);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on ${port}`));
