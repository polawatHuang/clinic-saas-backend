const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { canViewLogs } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canViewLogs, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const [rows] = await pool.query(
      `SELECT
         a.*,
         u.name AS user_name,
         u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.tenant_id = ?
       ORDER BY a.created_at DESC
       LIMIT ?`,
      [req.user.tenant_id, limit]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;