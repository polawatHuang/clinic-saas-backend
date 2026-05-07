const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { resolveTenant } = require("../middleware/tenant");
const validate = require("../middleware/validate");
const { leadSchema } = require("../validators/cms.validator");
const { cleanText } = require("../utils/sanitize");
const { canViewLeads } = require("../middleware/permission");

const router = express.Router();

router.post("/public", resolveTenant, validate(leadSchema), async (req, res, next) => {
  try {
    const {
      service_id,
      branch_id,
      name,
      phone,
      email,
      line_id,
      interested_service,
      message,
      source,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO leads
       (tenant_id, service_id, branch_id, name, phone, email, line_id,
        interested_service, message, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenant.id,
        service_id || null,
        branch_id || null,
        cleanText(name),
        cleanText(phone),
        email || null,
        line_id ? cleanText(line_id) : null,
        interested_service ? cleanText(interested_service) : null,
        message ? cleanText(message) : null,
        source || "website",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Lead submitted",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", auth, canViewLeads, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, s.name AS service_name, b.branch_name
       FROM leads l
       LEFT JOIN services s ON s.id = l.service_id
       LEFT JOIN branches b ON b.id = l.branch_id
       WHERE l.tenant_id = ?
       ORDER BY l.created_at DESC`,
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

router.put("/:id/status", auth, canViewLeads, async (req, res, next) => {
  try {
    const { status, note } = req.body;

    await pool.query(
      `UPDATE leads
       SET status = COALESCE(?, status),
           note = COALESCE(?, note)
       WHERE id = ? AND tenant_id = ?`,
      [status, note, req.params.id, req.user.tenant_id]
    );

    res.json({
      success: true,
      message: "Lead updated",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;