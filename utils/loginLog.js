const pool = require("../config/db");

async function createLoginLog({
  user_id = null,
  tenant_id = null,
  email,
  status,
  reason = null,
  ip_address = null,
  user_agent = null,
}) {
  try {
    await pool.query(
      `INSERT INTO login_logs
       (user_id, tenant_id, email, status, reason, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        tenant_id,
        email,
        status,
        reason,
        ip_address,
        user_agent,
      ]
    );
  } catch (error) {
    console.error("LOGIN LOG ERROR:", error);
  }
}

module.exports = createLoginLog;