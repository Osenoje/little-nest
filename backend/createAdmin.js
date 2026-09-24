const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function createAdmin() {

    const username = "admin";
    const password = "12345";

    try {

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            `
            INSERT INTO admins
            (username, password_hash)

            VALUES
            ($1, $2)
            `,
            [
                username,
                passwordHash
            ]
        );

        console.log("Admin account created successfully.");
        console.log("Username:", username);
        console.log("Password:", password);

    } catch (error) {

        console.error("Error creating admin:", error);

    } finally {

        await pool.end();

    }

}

createAdmin();