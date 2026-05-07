const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const validate = require("../middleware/validate");
const { reviewSchema } = require("../validators/cms.validator");
const { canManageContent, canDeleteContent } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM reviews
       WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(reviewSchema), async (req, res, next) => {
  try {
    const {
      customer_name,
      rating,
      review_text,
      image_url,
      source,
      status,
      sort_order,
    } = req.body;

    if (!customer_name) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO reviews
       (tenant_id, customer_name, rating, review_text, image_url, source, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        cleanText(customer_name),
        rating || 5,
        review_text ? cleanHtml(review_text) : null,
        image_url || null,
        source ? cleanText(source) : null,
        status || "active",
        sort_order || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Review created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, validate(reviewSchema.partial()), async (req, res, next) => {
  try {
    const fields = [
      "customer_name",
      "rating",
      "review_text",
      "image_url",
      "source",
      "status",
      "sort_order",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === "customer_name" || field === "source") {
          values.push(cleanText(req.body[field]));
        } else if (field === "review_text") {
          values.push(cleanHtml(req.body[field]));
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
      `UPDATE reviews
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({ success: true, message: "Review updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM reviews WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;