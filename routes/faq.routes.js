const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const validate = require("../middleware/validate");
const { faqSchema } = require("../validators/cms.validator");
const { canManageContent, canDeleteContent } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM faqs
       WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(faqSchema), async (req, res, next) => {
  try {
    const {
      question,
      answer,
      category,
      is_featured,
      status,
      sort_order,
    } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO faqs
       (tenant_id, question, answer, category, is_featured, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        cleanText(question),
        cleanHtml(answer),
        category ? cleanText(category) : null,
        is_featured ? 1 : 0,
        status || "active",
        sort_order || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "FAQ created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, validate(faqSchema.partial()), async (req, res, next) => {
  try {
    const fields = [
      "question",
      "answer",
      "category",
      "is_featured",
      "status",
      "sort_order",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === "question" || field === "category") {
          values.push(cleanText(req.body[field]));
        } else if (field === "answer") {
          values.push(cleanHtml(req.body[field]));
        } else {
          values.push(field === "is_featured" ? (req.body[field] ? 1 : 0) : req.body[field]);
        }
      }
    });

    if (!sets.length) {
      return res.json({ success: true, message: "Nothing to update" });
    }

    values.push(req.params.id, req.user.tenant_id);

    await pool.query(
      `UPDATE faqs
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({ success: true, message: "FAQ updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM faqs WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({ success: true, message: "FAQ deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;