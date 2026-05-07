require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./config/db");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const tenantRoutes = require("./routes/tenant.routes");
const publicRoutes = require("./routes/public.routes");
const serviceRoutes = require("./routes/service.routes");
const promotionRoutes = require("./routes/promotion.routes");
const leadRoutes = require("./routes/lead.routes");
const themeRoutes = require("./routes/theme.routes");
const pageRoutes = require("./routes/page.routes");
const pageSectionRoutes = require("./routes/pageSection.routes");
const articleRoutes = require("./routes/article.routes");
const doctorRoutes = require("./routes/doctor.routes");
const branchRoutes = require("./routes/branch.routes");
const reviewRoutes = require("./routes/review.routes");
const faqRoutes = require("./routes/faq.routes");
const mediaRoutes = require("./routes/media.routes");
const auditRoutes = require("./routes/audit.routes");
const loginLogRoutes = require("./routes/loginLog.routes");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
      ];

      if (!origin) return callback(null, true);

      if (
        allowed.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Clinic SaaS API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS db_status");

    res.json({
      success: true,
      api: "ok",
      database: rows[0].db_status === 1 ? "connected" : "unknown",
      uptime: process.uptime(),
      node: process.version,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      api: "ok",
      database: "error",
      message: error.message,
    });
  }
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/theme", themeRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/page-sections", pageSectionRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/login-logs", loginLogRoutes);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("API ERROR:", err);

  const isProduction = process.env.NODE_ENV === "production";

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Clinic SaaS API running on port ${PORT}`);
});