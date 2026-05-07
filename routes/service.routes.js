const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const slugify = require("../utils/slugify");
const validate = require("../middleware/validate");
const { serviceSchema } = require("../validators/cms.validator");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const createAuditLog = require("../utils/auditLog");
const { canManageContent, canDeleteContent } = require("../middleware/permission");
const {
  canManageContent,
  canDeleteContent,
} = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const [rows] = await pool.query(
      `SELECT * FROM services
       WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at DESC`,
      [tenantId],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(serviceSchema), async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const {
      name,
      slug,
      short_description,
      description,
      price_start,
      price_text,
      cover_image_url,
      category,
      is_featured,
      status,
      sort_order,
    } = req.body;

    const finalSlug = slug || slugify(cleanText(name));

    const [result] = await pool.query(
      `INSERT INTO services
       (tenant_id, name, slug, short_description, description, price_start, price_text,
        cover_image_url, category, is_featured, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        cleanText(name),
        finalSlug,
        short_description ? cleanText(short_description) : null,
        description ? cleanHtml(description) : null,
        price_start || null,
        price_text ? cleanText(price_text) : null,
        cover_image_url || null,
        category ? cleanText(category) : null,
        is_featured ? 1 : 0,
        status || "active",
        sort_order || 0,
      ],
    );

    await createAuditLog({
      tenant_id: tenantId,
      user_id: req.user.id,
      action: "CREATE",
      table_name: "services",
      record_id: result.insertId,
      new_data: req.body,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    res.status(201).json({
      success: true,
      message: "Service created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  auth,
  canManageContent,
  validate(serviceSchema.partial()),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenant_id;
      const id = req.params.id;

      const [[oldRecord]] = await pool.query(
        `SELECT *
        FROM services
        WHERE id = ? AND tenant_id = ?
        LIMIT 1`,
        [id, tenantId],
      );

      if (!oldRecord) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      const fields = [
        "name",
        "slug",
        "short_description",
        "description",
        "price_start",
        "price_text",
        "cover_image_url",
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
          if (
            field === "name" ||
            field === "short_description" ||
            field === "price_text" ||
            field === "category"
          ) {
            values.push(cleanText(req.body[field]));
          } else if (field === "description") {
            values.push(cleanHtml(req.body[field]));
          } else {
            values.push(req.body[field]);
          }
        }
      });

      if (!sets.length) {
        return res.json({
          success: true,
          message: "Nothing to update",
        });
      }

      values.push(id, tenantId);

      await pool.query(
        `UPDATE services
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
        values,
      );

      await createAuditLog({
        tenant_id: tenantId,
        user_id: req.user.id,
        action: "UPDATE",
        table_name: "services",
        record_id: id,
        old_data: oldRecord,
        new_data: req.body,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: "Service updated",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const id = req.params.id;

    const [[oldRecord]] = await pool.query(
      `SELECT *
        FROM services
        WHERE id = ? AND tenant_id = ?
        LIMIT 1`,
      [id, tenantId],
    );

    if (!oldRecord) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    await pool.query(
      `DELETE FROM services
       WHERE id = ? AND tenant_id = ?`,
      [id, tenantId],
    );

    await createAuditLog({
      tenant_id: tenantId,
      user_id: req.user.id,
      action: "DELETE",
      table_name: "services",
      record_id: id,
      old_data: oldRecord,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    res.json({
      success: true,
      message: "Service deleted",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
