const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { canManageSettings } = require("../middleware/permission");

const router = express.Router();

// GET — ดึง theme settings ของ tenant ตัวเอง
router.get("/", auth, async (req, res, next) => {
  try {
    const [[theme]] = await pool.query(
      `SELECT * FROM theme_settings WHERE tenant_id = ? LIMIT 1`,
      [req.user.tenant_id]
    );

    res.json({
      success: true,
      data: theme || null,
    });
  } catch (error) {
    next(error);
  }
});

// PUT — แก้ไข theme settings (clinic_admin ขึ้นไปเท่านั้น)
router.put("/", auth, canManageSettings, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const fields = [
      "primary_color",
      "secondary_color",
      "accent_color",
      "font_family",
      "layout_style",
      "logo_url",
      "favicon_url",
      "custom_css",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (!sets.length) {
      return res.json({
        success: true,
        message: "Nothing to update",
      });
    }

    values.push(tenantId);

    await pool.query(
      `UPDATE theme_settings
       SET ${sets.join(", ")}
       WHERE tenant_id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Theme updated",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;