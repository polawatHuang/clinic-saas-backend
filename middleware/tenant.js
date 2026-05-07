const pool = require("../config/db");

async function resolveTenant(req, res, next) {
  try {
    const host = req.headers.host?.split(":")[0];
    const tenantSlug = req.headers["x-tenant-slug"];
    const tenantDomain = req.headers["x-tenant-domain"] || host;

    let query = "";
    let params = [];

    if (tenantSlug) {
      query = "SELECT * FROM tenants WHERE slug = ? AND status = 'active' LIMIT 1";
      params = [tenantSlug];
    } else {
      query = "SELECT * FROM tenants WHERE domain = ? AND status = 'active' LIMIT 1";
      params = [tenantDomain];
    }

    const [rows] = await pool.query(query, params);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found",
      });
    }

    req.tenant = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

function requireTenantAccess(req, res, next) {
  if (req.user.role === "super_admin") return next();

  if (Number(req.user.tenant_id) !== Number(req.params.tenantId || req.body.tenant_id)) {
    return res.status(403).json({
      success: false,
      message: "No access to this tenant",
    });
  }

  next();
}

module.exports = {
  resolveTenant,
  requireTenantAccess,
};