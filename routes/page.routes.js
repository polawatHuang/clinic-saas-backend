const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const slugify = require("../utils/slugify");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const { canManageContent, canDeleteContent } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM pages
       WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at DESC`,
      [req.user.tenant_id],
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", auth, canManageContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const pageId = req.params.id;

    const [[page]] = await pool.query(
      `SELECT *
       FROM pages
       WHERE id = ? AND tenant_id = ?
       LIMIT 1`,
      [pageId, tenantId],
    );

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    const [sections] = await pool.query(
      `SELECT *
       FROM page_sections
       WHERE page_id = ? AND tenant_id = ?
       ORDER BY sort_order ASC`,
      [pageId, tenantId],
    );

    res.json({
      success: true,
      data: {
        ...page,
        sections,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;

    const {
      title,
      slug,
      page_type,
      content,
      status,
      sort_order,
      published_at,
    } = req.body;

    const safeTitle = cleanText(title);
    const safeContent = cleanHtml(content);

    if (!safeTitle) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const finalSlug = slug || slugify(safeTitle);

    const [result] = await pool.query(
      `INSERT INTO pages
       (tenant_id, title, slug, page_type, content, status, sort_order, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        safeTitle,
        finalSlug,
        page_type || "custom",
        safeContent || null,
        status || "draft",
        sort_order || 0,
        published_at || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Page created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const pageId = req.params.id;

    const fields = [
      "title",
      "slug",
      "page_type",
      "content",
      "status",
      "sort_order",
      "published_at",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === "title") {
          values.push(cleanText(req.body[field]));
        } else if (field === "content") {
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

    values.push(pageId, tenantId);

    await pool.query(
      `UPDATE pages
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values,
    );

    res.json({
      success: true,
      message: "Page updated",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM pages
       WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id],
    );

    res.json({
      success: true,
      message: "Page deleted",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
