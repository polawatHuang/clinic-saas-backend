const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { doctorSchema } = require("../validators/cms.validator");
const { canManageContent, canDeleteContent } = require("../middleware/permission");
const { cleanHtml, cleanText } = require("../utils/sanitize");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM doctors
       WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(doctorSchema), async (req, res, next) => {
  try {
    const {
      name,
      position,
      license_no,
      bio,
      image_url,
      sort_order,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Doctor name is required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO doctors
       (tenant_id, name, position, license_no, bio, image_url, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        cleanText(name),
        position ? cleanText(position) : null,
        license_no ? cleanText(license_no) : null,
        bio ? cleanHtml(bio) : null,
        image_url || null,
        sort_order || 0,
        status || "active",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Doctor created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, validate(doctorSchema.partial()), async (req, res, next) => {
  try {
    const fields = [
      "name",
      "position",
      "license_no",
      "bio",
      "image_url",
      "sort_order",
      "status",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === "bio") {
          values.push(cleanHtml(req.body[field]));
        } else if (field === "name" || field === "position" || field === "license_no") {
          values.push(cleanText(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    });

    if (!sets.length) {
      return res.json({ success: true, message: "Nothing to update" });
    }

    values.push(req.params.id, req.user.tenant_id);

    await pool.query(
      `UPDATE doctors
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({ success: true, message: "Doctor updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM doctors WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({ success: true, message: "Doctor deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;