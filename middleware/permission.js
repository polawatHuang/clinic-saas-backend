// Generic role checker
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Permission denied",
      });
    }
    next();
  };
}

// super_admin, clinic_admin, editor — เพิ่ม/แก้ content ได้
function canManageContent(req, res, next) {
  const allowed = ["super_admin", "clinic_admin", "editor"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Permission denied",
    });
  }
  next();
}

// super_admin, clinic_admin — ลบ content ได้ (editor ห้าม)
function canDeleteContent(req, res, next) {
  const allowed = ["super_admin", "clinic_admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Only admin can delete content",
    });
  }
  next();
}

// super_admin, clinic_admin — แก้ theme/settings ได้ (editor ห้าม)
function canManageSettings(req, res, next) {
  const allowed = ["super_admin", "clinic_admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Only admin can manage settings",
    });
  }
  next();
}

// super_admin, clinic_admin — ดู leads ได้ (editor ห้าม)
function canViewLeads(req, res, next) {
  const allowed = ["super_admin", "clinic_admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Permission denied",
    });
  }
  next();
}

// super_admin, clinic_admin — ดู audit/login logs ได้ (editor ห้าม)
function canViewLogs(req, res, next) {
  const allowed = ["super_admin", "clinic_admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Permission denied",
    });
  }
  next();
}

// super_admin, clinic_admin — จัดการ users ได้ (editor ห้าม)
function canManageUsers(req, res, next) {
  const allowed = ["super_admin", "clinic_admin"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Only admin can manage users",
    });
  }
  next();
}

// super_admin เท่านั้น — จัดการ tenants
function superAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin only",
    });
  }
  next();
}

module.exports = {
  allowRoles,
  canManageContent,
  canDeleteContent,
  canManageSettings,
  canViewLeads,
  canViewLogs,
  canManageUsers,
  superAdminOnly,
};