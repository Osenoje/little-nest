const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const path = require("path");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();



const app = express();

// Render supplies PORT at runtime. Keep 5000 for local development.
const PORT = process.env.PORT || 5000;


// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());




// =========================
// VERIFY ADMIN JWT
// =========================

function verifyAdminToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({
            message: "Access denied. Admin login required."
        });

    }

    const token = authHeader.split(" ")[1];

    if (!token) {

        return res.status(401).json({
            message: "Access denied. Invalid token."
        });

    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.admin = decoded;

        next();

    } catch (error) {

        console.error("JWT verification error:", error);

        return res.status(401).json({
            message: "Invalid or expired admin token."
        });

    }

}


// =========================
// SERVE UPLOADED IMAGES
// =========================

app.use("/uploads", express.static("uploads"));


// =========================
// IMAGE UPLOAD
// =========================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1E9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );

    }

});

const upload = multer({
    storage: storage
});


// =========================
// DATABASE
// =========================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});


// =========================
// TEST DATABASE CONNECTION
// =========================

pool.connect()
    .then(client => {

        console.log("PostgreSQL connected successfully.");

        client.release();

    })
    .catch(error => {

        console.error(
            "PostgreSQL connection error:",
            error.message
        );

    });


// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {

    res.send("Little Nest backend is running!");

});

// =========================
// ADMIN LOGIN
// =========================

app.post("/api/admin/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {

            return res.status(400).json({
                message: "Username and password are required."
            });

        }

        const result = await pool.query(
            `
            SELECT *
            FROM admins
            WHERE username = $1
            `,
            [username]
        );

        if (result.rows.length === 0) {

            return res.status(401).json({
                message: "Invalid username or password."
            });

        }

        const admin = result.rows[0];

        const passwordMatches = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatches) {

            return res.status(401).json({
                message: "Invalid username or password."
            });

        }

        const token = jwt.sign(
            {
                adminId: admin.id,
                username: admin.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        res.json({
            message: "Login successful.",
            token: token
        });

    } catch (error) {

        console.error("Admin login error:", error);

        res.status(500).json({
            message: "Server error."
        });

    }

});




app.put("/api/admin/change-password", verifyAdminToken, async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "New password must be at least 6 characters."
            });
        }

        // Get the currently logged-in admin
        const result = await pool.query(
            `
            SELECT *
            FROM admins
            WHERE id = $1
            `,
            [req.admin.adminId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Admin account not found."
            });
        }

        const admin = result.rows[0];

        // Check current password
        const passwordMatches = await bcrypt.compare(
            currentPassword,
            admin.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        // Hash the new password
        const newPasswordHash = await bcrypt.hash(
            newPassword,
            10
        );

        // Save new password
        await pool.query(
            `
            UPDATE admins
            SET password_hash = $1
            WHERE id = $2
            `,
            [
                newPasswordHash,
                req.admin.adminId
            ]
        );

        res.json({
            message: "Password changed successfully."
        });

    } catch (error) {

        console.error("Change password error:", error);

        res.status(500).json({
            message: "Server error."
        });

    }

});


// =========================
// ADD PRODUCT WITH IMAGE
// =========================

app.post(
    "/api/products",
    verifyAdminToken,
    upload.single("image"),
    async (req, res) => {

        try {

            const { name, price, category } = req.body;


            if (
                !name ||
                !price ||
                !category ||
                !req.file
            ) {

                return res.status(400).json({

                    message:
                        "Please provide all product details and an image."

                });

            }


            const image_url =
                `/uploads/${req.file.filename}`;


            const result = await pool.query(

                `
                INSERT INTO products
                (name, price, category, image_url)

                VALUES
                ($1, $2, $3, $4)

                RETURNING *
                `,

                [
                    name,
                    price,
                    category,
                    image_url
                ]

            );


            res.status(201).json({

                message:
                    "Product added successfully.",

                product:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "Error adding product:",
                error
            );


            res.status(500).json({

                message:
                    "Server error."

            });

        }

    }
);


// =========================
// GET ALL PRODUCTS
// =========================

app.get("/api/products", async (req, res) => {

    try {

        const result = await pool.query(
            "SELECT * FROM products ORDER BY id DESC"
        );

        res.json(result.rows);

    } catch (error) {

        console.error("Error getting products:", error);

        res.status(500).json({
            message: "Server error."
        });

    }

});


// =========================
// DELETE PRODUCT
// =========================

app.delete(
    "/api/products/:id",
    verifyAdminToken,
    async (req, res) => {

    try {

        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM products WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Product not found."
            });

        }

        res.json({
            message: "Product deleted successfully.",
            product: result.rows[0]
        });

    } catch (error) {

        console.error("Error deleting product:", error);

        res.status(500).json({
            message: "Server error."
        });

    }

});


// =========================
// UPDATE PRODUCT
// =========================

app.put(
    "/api/products/:id",
    verifyAdminToken,
    upload.single("image"),
    async (req, res) => {

        try {

            const { id } = req.params;
            const { name, price, category } = req.body;

            if (!name || !price || !category) {

                return res.status(400).json({
                    message: "Please provide all product details."
                });

            }

            // If a new image was uploaded
            if (req.file) {

                const image_url =
                    `/uploads/${req.file.filename}`;

                const result = await pool.query(
                    `
                    UPDATE products
                    SET
                        name = $1,
                        price = $2,
                        category = $3,
                        image_url = $4
                    WHERE id = $5
                    RETURNING *
                    `,
                    [
                        name,
                        price,
                        category,
                        image_url,
                        id
                    ]
                );

                if (result.rows.length === 0) {

                    return res.status(404).json({
                        message: "Product not found."
                    });

                }

                return res.json({
                    message: "Product updated successfully.",
                    product: result.rows[0]
                });

            }

            // If no new image was uploaded
            const result = await pool.query(
                `
                UPDATE products
                SET
                    name = $1,
                    price = $2,
                    category = $3
                WHERE id = $4
                RETURNING *
                `,
                [
                    name,
                    price,
                    category,
                    id
                ]
            );

            if (result.rows.length === 0) {

                return res.status(404).json({
                    message: "Product not found."
                });

            }

            res.json({
                message: "Product updated successfully.",
                product: result.rows[0]
            });

        } catch (error) {

            console.error("Error updating product:", error);

            res.status(500).json({
                message: "Server error."
            });

        }

    }
);

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {

    console.log(
        `Little Nest backend running on http://localhost:${PORT}`
    );

});
