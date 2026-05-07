const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const slugify = require("../utils/slugify");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const validate = require("../middleware/validate");
const { promotionSchema } = require("../validators/cms.validator");
const { canManageContent, canDeleteContent } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, s.name AS service_name
       FROM promotions p
       LEFT JOIN services s ON s.id = p.service_id
       WHERE p.tenant_id = ?
       ORDER BY p.sort_order ASC, p.created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(promotionSchema), async (req, res, next) => {
  try {
    const {
      service_id,
      title,
      slug,
      description,
      original_price,
      promo_price,
      promo_text,
      image_url,
      start_date,
      end_date,
      status,
      sort_order,
    } = req.body;

    const finalSlug = slug || slugify(cleanText(title));

    const [result] = await pool.query(
      `INSERT INTO promotions
       (tenant_id, service_id, title, slug, description, original_price, promo_price,
        promo_text, image_url, start_date, end_date, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        service_id || null,
        cleanText(title),
        finalSlug,
        description ? cleanHtml(description) : null,
        original_price || null,
        promo_price || null,
        promo_text ? cleanText(promo_text) : null,
        image_url || null,
        start_date || null,
        end_date || null,
        status || "active",
        sort_order || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Promotion created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, validate(promotionSchema.partial()), async (req, res, next) => {
  try {
    const fields = [
      "service_id",
      "title",
      "slug",
      "description",
      "original_price",
      "promo_price",
      "promo_text",
      "image_url",
      "start_date",
      "end_date",
      "status",
      "sort_order",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === "title" || field === "promo_text") {
          values.push(cleanText(req.body[field]));
        } else if (field === "description") {
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
      `UPDATE promotions
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Promotion updated",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM promotions
       WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({
      success: true,
      message: "Promotion deleted",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;