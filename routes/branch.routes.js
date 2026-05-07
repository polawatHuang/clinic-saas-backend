const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { branchSchema } = require("../validators/cms.validator");
const { canManageContent, canDeleteContent } = require("../middleware/permission");
const { cleanText } = require("../utils/sanitize");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM branches
       WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(branchSchema), async (req, res, next) => {
  try {
    const {
      branch_name,
      address,
      province,
      district,
      phone,
      google_map_url,
      latitude,
      longitude,
      opening_hours,
      status,
      sort_order,
    } = req.body;

    if (!branch_name) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO branches
       (tenant_id, branch_name, address, province, district, phone,
        google_map_url, latitude, longitude, opening_hours, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        cleanText(branch_name),
        address ? cleanText(address) : null,
        province ? cleanText(province) : null,
        district ? cleanText(district) : null,
        phone ? cleanText(phone) : null,
        google_map_url || null,
        latitude || null,
        longitude || null,
        opening_hours ? cleanText(opening_hours) : null,
        status || "active",
        sort_order || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Branch created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, validate(branchSchema.partial()), async (req, res, next) => {
  try {
    const fields = [
      "branch_name",
      "address",
      "province",
      "district",
      "phone",
      "google_map_url",
      "latitude",
      "longitude",
      "opening_hours",
      "status",
      "sort_order",
    ];

    const sets = [];
    const values = [];

    const textFields = ["branch_name", "address", "province", "district", "phone", "opening_hours"];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (textFields.includes(field)) {
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
      `UPDATE branches
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({ success: true, message: "Branch updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM branches WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({ success: true, message: "Branch deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;