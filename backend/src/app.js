import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs/promises";
import { env } from "./config/env.js";
import { db, one } from "./config/db.js";
import { wrap, ok } from "./utils/common.js";
import { authenticate, authorize, storeScope } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import storeRoutes from "./routes/store.js";
import storeProducts from "./routes/storeProducts.js";
import storeOrders from "./routes/storeOrders.js";
import catalogRoutes from "./routes/catalog.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import chatRoutes from "./routes/chat.js";
import notificationRoutes from "./routes/notifications.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        !env.CLIENT_ORIGIN ||
        origin === env.CLIENT_ORIGIN ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return cb(null, true);
      }
      return cb(null, true);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const strict = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "production" ? 30 : 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Terlalu banyak percobaan, coba lagi dalam 15 menit",
  },
});
app.use("/api", general);
const sendMediaBuffer = (req, res, mime, buf) => {
  res.setHeader("Content-Type", mime || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");
  const total = buf.length;
  const range = req.headers.range;
  if (range && mime?.startsWith("video/")) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    if (start >= total || end >= total) {
      res.status(416).setHeader("Content-Range", `bytes */${total}`);
      return res.end();
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    res.setHeader("Content-Length", end - start + 1);
    return res.end(buf.subarray(start, end + 1));
  }
  res.setHeader("Content-Length", total);
  return res.end(buf);
};
const serveUpload = async (req, res) => {
  const filename = path.basename(req.params.filename);
  const localPath = path.resolve(
    process.env.VERCEL ? "/tmp" : process.cwd(),
    env.UPLOAD_DIR,
    filename,
  );
  try {
    const stat = await fs.stat(localPath);
    if (stat.isFile()) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.sendFile(localPath);
    }
  } catch {}
  try {
    const row = await one(
      "SELECT mime, data FROM uploaded_files WHERE filename=?",
      [filename],
    );
    if (row && row.data) {
      return sendMediaBuffer(req, res, row.mime, row.data);
    }
  } catch (err) {
    console.error("Error fetching image from DB:", err.message);
  }
  return res.status(404).send("Media tidak ditemukan");
};
app.get("/uploads/:filename", serveUpload);
app.get("/api/uploads/:filename", serveUpload);
app.use(
  "/uploads",
  express.static(
    path.resolve(process.env.VERCEL ? "/tmp" : process.cwd(), env.UPLOAD_DIR),
    { maxAge: "7d" },
  ),
);
app.get("/", (req, res) =>
  res.json({
    success: true,
    service: "KampusBalik Marketplace COD API",
    status: "online",
    health: "/api/health",
  }),
);
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    ok(
      res,
      { database: "connected", service: "marketplace-cod" },
      "API dan database aktif",
    );
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Gagal terhubung ke database",
      error: err.message,
      code: err.code,
    });
  }
});
app.use(
  [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/register-store",
    "/api/auth/forgot-password",
  ],
  strict,
);
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/admin", authenticate, authorize("super_admin"), adminRoutes);
app.use(
  "/api/store/products",
  authenticate,
  authorize("admin_toko"),
  storeScope,
  storeProducts,
);
app.use(
  "/api/store/orders",
  authenticate,
  authorize("admin_toko"),
  storeScope,
  storeOrders,
);
app.use(
  "/api/store",
  authenticate,
  authorize("admin_toko"),
  storeRoutes,
);
app.use("/api/cart", authenticate, authorize("customer"), cartRoutes);
app.use("/api/orders", authenticate, authorize("customer"), orderRoutes);
app.use(
  "/api/chat",
  authenticate,
  authorize("customer", "admin_toko"),
  chatRoutes,
);
app.use("/api/notifications", authenticate, notificationRoutes);
app.use("/api", (req, res) =>
  res.status(404).json({ success: false, message: "Endpoint tidak ditemukan" }),
);
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE")
    err = { status: 422, message: "Ukuran gambar maksimal 2 MB" };
  if (err.code === "LIMIT_FILE_COUNT")
    err = { status: 422, message: "Maksimal 5 foto per produk" };
  errorHandler(err, req, res, next);
});
export default app;
