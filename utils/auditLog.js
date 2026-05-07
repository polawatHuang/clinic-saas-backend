const pool = require("../config/db");

async function createAuditLog({
  tenant_id = null,
  user_id = null,
  action,
  table_name,
  record_id = null,
  old_data = null,
  new_data = null,
  ip_address = null,
  user_agent = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs
       (
         tenant_id,
         user_id,
         action,
         table_name,
         record_id,
         old_data,
         new_data,
         ip_address,
         user_agent
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tenant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_data ? JSON.stringify(old_data) : null,
        new_data ? JSON.stringify(new_data) : null,
        ip_address,
        user_agent,
      ]
    );
  } catch (error) {
    console.error("AUDIT LOG ERROR:", error);
  }
}

module.exports = createAuditLog;