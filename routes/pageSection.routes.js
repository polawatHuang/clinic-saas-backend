const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const { canManageContent, canDeleteContent } = require("../middleware/permission");

const router = express.Router();

router.get("/:pageId", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM page_sections
       WHERE tenant_id = ? AND page_id = ?
       ORDER BY sort_order ASC`,
      [req.user.tenant_id, req.params.pageId]
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:pageId", auth, canManageContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const pageId = req.params.pageId;

    const {
      section_type,
      title,
      subtitle,
      content,
      image_url,
      button_text,
      button_url,
      config,
      is_enabled,
      sort_order,
    } = req.body;

    if (!section_type) {
      return res.status(400).json({
        success: false,
        message: "section_type is required",
      });
    }

    const [pageRows] = await pool.query(
      `SELECT id FROM pages
       WHERE id = ? AND tenant_id = ?
       LIMIT 1`,
      [pageId, tenantId]
    );

    if (!pageRows.length) {
      return res.status(404).json({
        success: false,
        message: "Page not found",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO page_sections
       (tenant_id, page_id, section_type, title, subtitle, content, image_url,
        button_text, button_url, config, is_enabled, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        pageId,
        section_type,
        title ? cleanText(title) : null,
        subtitle ? cleanText(subtitle) : null,
        content ? cleanHtml(content) : null,
        image_url || null,
        button_text ? cleanText(button_text) : null,
        button_url ? cleanText(button_url) : null,
        config ? JSON.stringify(config) : null,
        is_enabled === false ? 0 : 1,
        sort_order || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Section created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:pageId/:sectionId", auth, canManageContent, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { pageId, sectionId } = req.params;

    const fields = [
      "section_type",
      "title",
      "subtitle",
      "content",
      "image_url",
      "button_text",
      "button_url",
      "config",
      "is_enabled",
      "sort_order",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);

        if (field === "config") {
          values.push(JSON.stringify(req.body[field]));
        } else if (field === "is_enabled") {
          values.push(req.body[field] ? 1 : 0);
        } else if (field === "title" || field === "subtitle" || field === "button_text" || field === "button_url") {
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

    values.push(sectionId, pageId, tenantId);

    await pool.query(
      `UPDATE page_sections
       SET ${sets.join(", ")}
       WHERE id = ? AND page_id = ? AND tenant_id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Section updated",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:pageId/:sectionId", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM page_sections
       WHERE id = ? AND page_id = ? AND tenant_id = ?`,
      [req.params.sectionId, req.params.pageId, req.user.tenant_id]
    );

    res.json({
      success: true,
      message: "Section deleted",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;