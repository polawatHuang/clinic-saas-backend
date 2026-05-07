const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/auth");
const slugify = require("../utils/slugify");
const { cleanHtml, cleanText } = require("../utils/sanitize");
const validate = require("../middleware/validate");
const { articleSchema } = require("../validators/cms.validator");
const { canManageContent, canDeleteContent } = require("../middleware/permission");

const router = express.Router();

router.get("/", auth, canManageContent, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM articles
       WHERE tenant_id = ?
       ORDER BY published_at DESC, created_at DESC`,
      [req.user.tenant_id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, canManageContent, validate(articleSchema), async (req, res, next) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      cover_image_url,
      author_name,
      status,
      published_at,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Article title is required",
      });
    }

    const safeTitle = cleanText(title);
    const finalSlug = slug || slugify(safeTitle);

    const [result] = await pool.query(
      `INSERT INTO articles
       (tenant_id, title, slug, excerpt, content, cover_image_url, author_name, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
        safeTitle,
        finalSlug,
        excerpt ? cleanText(excerpt) : null,
        content ? cleanHtml(content) : null,
        cover_image_url || null,
        author_name ? cleanText(author_name) : null,
        status || "draft",
        published_at || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Article created",
      id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", auth, canManageContent, validate(articleSchema.partial()), async (req, res, next) => {
  try {
    const fields = [
      "title",
      "slug",
      "excerpt",
      "content",
      "cover_image_url",
      "author_name",
      "status",
      "published_at",
    ];

    const sets = [];
    const values = [];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        sets.push(`${field} = ?`);
        if (field === "title" || field === "excerpt" || field === "author_name") {
          values.push(cleanText(req.body[field]));
        } else if (field === "content") {
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
      `UPDATE articles
       SET ${sets.join(", ")}
       WHERE id = ? AND tenant_id = ?`,
      values
    );

    res.json({ success: true, message: "Article updated" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", auth, canDeleteContent, async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM articles WHERE id = ? AND tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );

    res.json({ success: true, message: "Article deleted" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;