require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("./config/db");

async function createSuperAdmin() {
  try {
    const name = "Super Admin";
    const email = "admin@clinic-saas.com";
    const password = "Admin@123456";

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users
       (tenant_id, name, email, password_hash, role, status)
       VALUES (NULL, ?, ?, ?, 'super_admin', 'active')`,
      [name, email, passwordHash]
    );

    console.log("Super admin created");
    console.log("Email:", email);
    console.log("Password:", password);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

createSuperAdmin();