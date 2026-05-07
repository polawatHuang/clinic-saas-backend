const express = require("express");
const pool = require("../config/db");
const { resolveTenant } = require("../middleware/tenant");

const router = express.Router();

router.get("/site", resolveTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;

    const [[theme]] = await pool.query(
      `SELECT * FROM theme_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );

    const [sections] = await pool.query(
      `SELECT * FROM homepage_sections
       WHERE tenant_id = ? AND is_enabled = 1
       ORDER BY sort_order ASC`,
      [tenantId]
    );

    const [services] = await pool.query(
      `SELECT * FROM services
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY is_featured DESC, sort_order ASC`,
      [tenantId]
    );

    const [promotions] = await pool.query(
      `SELECT * FROM promotions
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC, created_at DESC`,
      [tenantId]
    );

    const [branches] = await pool.query(
      `SELECT * FROM branches
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC`,
      [tenantId]
    );

    res.json({
      success: true,
      tenant: req.tenant,
      theme,
      sections,
      services,
      promotions,
      branches,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/services/:slug", resolveTenant, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM services
       WHERE tenant_id = ? AND slug = ? AND status = 'active'
       LIMIT 1`,
      [req.tenant.id, req.params.slug]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/pages/:slug", resolveTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const slug = req.params.slug;

    const [[page]] = await pool.query(
      `SELECT *
       FROM pages
       WHERE tenant_id = ?
       AND slug = ?
       AND status = 'published'
       LIMIT 1`,
      [tenantId, slug]
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
       WHERE tenant_id = ?
       AND page_id = ?
       AND is_enabled = 1
       ORDER BY sort_order ASC`,
      [tenantId, page.id]
    );

    const [[seo]] = await pool.query(
      `SELECT *
       FROM seo_settings
       WHERE tenant_id = ?
       AND page_key = ?
       LIMIT 1`,
      [tenantId, slug]
    );

    res.json({
      success: true,
      tenant: req.tenant,
      page,
      sections,
      seo: seo || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/cms", resolveTenant, async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;

    const [[theme]] = await pool.query(
      `SELECT * FROM theme_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );

    const [services] = await pool.query(
      `SELECT * FROM services
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY is_featured DESC, sort_order ASC`,
      [tenantId]
    );

    const [promotions] = await pool.query(
      `SELECT * FROM promotions
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC, created_at DESC`,
      [tenantId]
    );

    const [doctors] = await pool.query(
      `SELECT * FROM doctors
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC`,
      [tenantId]
    );

    const [branches] = await pool.query(
      `SELECT * FROM branches
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC`,
      [tenantId]
    );

    const [reviews] = await pool.query(
      `SELECT * FROM reviews
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC`,
      [tenantId]
    );

    const [faqs] = await pool.query(
      `SELECT * FROM faqs
       WHERE tenant_id = ? AND status = 'active'
       ORDER BY sort_order ASC`,
      [tenantId]
    );

    const [articles] = await pool.query(
      `SELECT id, title, slug, excerpt, cover_image_url, author_name, published_at
       FROM articles
       WHERE tenant_id = ? AND status = 'published'
       ORDER BY published_at DESC, created_at DESC
       LIMIT 12`,
      [tenantId]
    );

    res.json({
      success: true,
      tenant: req.tenant,
      theme,
      services,
      promotions,
      doctors,
      branches,
      reviews,
      faqs,
      articles,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/articles/:slug", resolveTenant, async (req, res, next) => {
  try {
    const [[article]] = await pool.query(
      `SELECT *
       FROM articles
       WHERE tenant_id = ?
       AND slug = ?
       AND status = 'published'
       LIMIT 1`,
      [req.tenant.id, req.params.slug]
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    res.json({
      success: true,
      tenant: req.tenant,
      data: article,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;