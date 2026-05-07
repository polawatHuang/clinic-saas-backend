const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { canManageContent, canDeleteContent } = require("../middleware/permission");
const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
const allowedMime = ["image/jpeg", "image/png", "image/webp"];

const router = express.Router();

const uploadRoot = path.join(__dirname, "../public/uploads");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantId = req.user.tenant_id || "super-admin";
    const uploadDir = path.join(uploadRoot, String(tenantId));

    ensureDir(uploadDir);
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname
      .replace(ext, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9ก-๙-_]/g, "")
      .toLowerCase();

    const fileName = `${Date.now()}-${safeName}${ext}`;
    cb(null, fileName);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExt.includes(ext)) {
    return cb(new Error("File extension is not allowed"), false);
  }

  if (!allowedMime.includes(file.mimetype)) {
    return cb(new Error("File type is not allowed"), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM media_files
       WHERE tenant_id = ?
       ORDER BY created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/upload", auth, canManageContent, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const tenantId = req.user.tenant_id;
    const fileUrl = `/uploads/${tenantId}/${req.file.filename}`;

    const [result] = await pool.query(
      `INSERT INTO media_files
       (tenant_id, file_name, file_url, file_type, file_size, alt_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        req.file.originalname,
        fileUrl,
        req.file.mimetype,
        req.file.size,
        req.body.alt_text || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "File uploaded",
      data: {
        id: result.insertId,
        file_name: req.file.originalname,
        file_url: fileUrl,
        full_url: `${req.protocol}://${req.get("host")}${fileUrl}`,
        file_type: req.file.mimetype,
        file_size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    const [[file]] = await pool.query(
      `SELECT *
       FROM media_files
       WHERE id = ? AND tenant_id = ?
       LIMIT 1`,
      [req.params.id, req.user.tenant_id]
    );

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const filePath = path.join(__dirname, "../public", file.file_url);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query(
      `DELETE FROM media_files
       WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({
      success: true,
      message: "File deleted",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;