const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
}

function superAdminOnly(req, res, next) {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin only",
    });
  }

  next();
}

module.exports = {
  auth,
  superAdminOnly,
};