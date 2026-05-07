const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { auth, superAdminOnly } = require("../middleware/auth");
const slugify = require("../utils/slugify");
const { canManageSettings } = require("../middleware/permission");
const { cleanText } = require("../utils/sanitize");

const router = express.Router();

router.get("/", auth, superAdminOnly, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM tenants ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", auth, superAdminOnly, async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const {
      clinic_name,
      slug,
      domain,
      phone,
      email,
      line_oa_url,
      admin_name,
      admin_email,
      admin_password,
    } = req.body;

    const finalSlug = slug || slugify(cleanText(clinic_name));

    const [tenantResult] = await conn.query(
      `INSERT INTO tenants
       (slug, clinic_name, domain, phone, email, line_oa_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        finalSlug,
        cleanText(clinic_name),
        domain ? cleanText(domain) : null,
        phone ? cleanText(phone) : null,
        email ? cleanText(email) : null,
        line_oa_url || null,
      ]
    );

    const tenantId = tenantResult.insertId;

    await conn.query(
      `INSERT INTO theme_settings
       (tenant_id, primary_color, secondary_color, accent_color, font_family, layout_style)
       VALUES (?, '#16a34a', '#fdf2f8', '#ec4899', 'Kanit', 'modern')`,
      [tenantId]
    );

    if (admin_email && admin_password) {
      const passwordHash = await bcrypt.hash(admin_password, 10);

      await conn.query(
        `INSERT INTO users
         (tenant_id, name, email, password_hash, role)
         VALUES (?, ?, ?, ?, 'clinic_admin')`,
        [tenantId, admin_name || clinic_name, admin_email, passwordHash]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: "Tenant created",
      tenant_id: tenantId,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
});

router.put("/:id", auth, canManageSettings, async (req, res, next) => {
  try {
    const tenantId = req.params.id;

    if (req.user.role !== "super_admin" && Number(req.user.tenant_id) !== Number(tenantId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const {
      clinic_name,
      domain,
      logo_url,
      phone,
      email,
      line_oa_url,
      facebook_url,
      tiktok_url,
      instagram_url,
      status,
    } = req.body;

    await pool.query(
      `UPDATE tenants
       SET clinic_name = COALESCE(?, clinic_name),
           domain = COALESCE(?, domain),
           logo_url = COALESCE(?, logo_url),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           line_oa_url = COALESCE(?, line_oa_url),
           facebook_url = COALESCE(?, facebook_url),
           tiktok_url = COALESCE(?, tiktok_url),
           instagram_url = COALESCE(?, instagram_url),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        clinic_name ? cleanText(clinic_name) : null,
        domain ? cleanText(domain) : null,
        logo_url || null,
        phone ? cleanText(phone) : null,
        email ? cleanText(email) : null,
        line_oa_url || null,
        facebook_url || null,
        tiktok_url || null,
        instagram_url || null,
        status || null,
        tenantId,
      ]
    );

    res.json({
      success: true,
      message: "Tenant updated",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;