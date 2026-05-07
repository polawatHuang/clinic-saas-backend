const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const createLoginLog = require("../utils/loginLog");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../utils/token");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const ip = req.ip;
    const userAgent = req.headers["user-agent"];

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [rows] = await pool.query(
      `SELECT id, tenant_id, name, email, password_hash, role, status,
              failed_login_count, locked_until
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    if (!rows.length) {
      await createLoginLog({
        email,
        status: "failed",
        reason: "email_not_found",
        ip_address: ip,
        user_agent: userAgent,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = rows[0];

    if (user.status !== "active") {
      await createLoginLog({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email,
        status: "failed",
        reason: "user_inactive",
        ip_address: ip,
        user_agent: userAgent,
      });

      return res.status(403).json({
        success: false,
        message: "User inactive",
      });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await createLoginLog({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email,
        status: "locked",
        reason: "account_locked",
        ip_address: ip,
        user_agent: userAgent,
      });

      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked. Please try again later.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const newFailedCount = Number(user.failed_login_count || 0) + 1;

      let lockedUntil = null;

      if (newFailedCount >= 10) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await pool.query(
        `UPDATE users
         SET failed_login_count = ?,
             locked_until = ?
         WHERE id = ?`,
        [newFailedCount, lockedUntil, user.id],
      );

      await createLoginLog({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email,
        status: "failed",
        reason: lockedUntil ? "too_many_attempts_locked" : "wrong_password",
        ip_address: ip,
        user_agent: userAgent,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    await pool.query(
      `UPDATE users
       SET failed_login_count = 0,
           locked_until = NULL,
           last_login_at = NOW(),
           last_login_ip = ?
       WHERE id = ?`,
      [ip, user.id],
    );

    await createLoginLog({
      user_id: user.id,
      tenant_id: user.tenant_id,
      email,
      status: "success",
      reason: "login_success",
      ip_address: ip,
      user_agent: userAgent,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshHash = hashToken(refreshToken);

    const refreshExpire = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens
   (
     user_id,
     tenant_id,
     token_hash,
     expires_at,
     created_ip,
     created_ua
   )
   VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, user.tenant_id, refreshHash, refreshExpire, ip, userAgent],
    );

    delete user.password_hash;
    delete user.failed_login_count;
    delete user.locked_until;

    res.json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const tokenHash = hashToken(refresh_token);

    const [[storedToken]] = await pool.query(
      `SELECT *
       FROM refresh_tokens
       WHERE token_hash = ?
       AND revoked_at IS NULL
       AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token revoked or expired",
      });
    }

    if (storedToken.user_id !== decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE id = ?`,
      [storedToken.id],
    );

    const [[user]] = await pool.query(
      `SELECT id, tenant_id, name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id],
    );

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "User invalid",
      });
    }

    const newRefreshToken = generateRefreshToken(user);

    const newRefreshHash = hashToken(newRefreshToken);

    await pool.query(
      `INSERT INTO refresh_tokens
        (
          user_id,
          tenant_id,
          token_hash,
          expires_at,
          created_ip,
          created_ua
        )
        VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.tenant_id,
        newRefreshHash,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        req.ip,
        req.headers["user-agent"],
      ],
    );

    const newAccessToken = generateAccessToken(user);

    res.json({
      success: true,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", auth, async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const tokenHash = hashToken(refresh_token);

    await pool.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = ?
       AND user_id = ?`,
      [tokenHash, req.user.id],
    );

    res.json({
      success: true,
      message: "Logged out",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tenant_id, name, email, role, status
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id],
    );

    res.json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
