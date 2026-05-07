const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { canViewLogs } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canViewLogs, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);

    let query = `
      SELECT
        l.*,
        u.name AS user_name
      FROM login_logs l
      LEFT JOIN users u ON u.id = l.user_id
    `;

    const params = [];

    if (req.user.role === "super_admin") {
      query += ` ORDER BY l.created_at DESC LIMIT ?`;
      params.push(limit);
    } else {
      query += ` WHERE l.tenant_id = ? ORDER BY l.created_at DESC LIMIT ?`;
      params.push(req.user.tenant_id, limit);
    }

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;