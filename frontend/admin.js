const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("admin-login-form");

const usernameInput = document.getElementById("admin-username");
const passwordInput = document.getElementById("admin-password");

const loginMessage = document.getElementById("admin-login-message");

const logoutBtn = document.getElementById("logout-btn");



const addProductBtn = document.getElementById("add-product-btn");

const productForm = document.getElementById("product-form");


let editingProductId = null;

const productName = document.getElementById("product-name");
const productPrice = document.getElementById("product-price");
const productCategory = document.getElementById("product-category");
const productImage = document.getElementById("product-image");

const saveProductBtn = document.getElementById("save-product-btn");
const cancelProductBtn = document.getElementById("cancel-product-btn");

const adminProducts = document.getElementById("admin-products");

const formatPrice = (price) => new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
}).format(price);


// =========================
// LOGIN
// =========================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {

        loginMessage.textContent =
            "Please enter your username and password.";

        return;
    }

    try {

        const response = await fetch(
            "http://localhost:5000/api/admin/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            loginMessage.textContent =
                data.message || "Invalid username or password.";

            return;
        }

        // Save the JWT token
        localStorage.setItem("adminToken", data.token);

        // Show dashboard
        loginSection.style.display = "none";
        dashboardSection.style.display = "block";

        // Clear login fields
        usernameInput.value = "";
        passwordInput.value = "";

        loginMessage.textContent = "";

    } catch (error) {

        console.error("Login error:", error);

        loginMessage.textContent =
            "Unable to connect to the server.";

    }

});

// =========================
// LOGOUT
// =========================

logoutBtn.addEventListener("click", () => {

    localStorage.removeItem("adminToken");

    dashboardSection.style.display = "none";
    loginSection.style.display = "block";

});


// =========================
// OPEN PRODUCT FORM
// =========================

addProductBtn.addEventListener("click", () => {

    productForm.style.display = "block";

});


// =========================
// CANCEL PRODUCT FORM
// =========================

cancelProductBtn.addEventListener("click", () => {

    editingProductId = null;

    productName.value = "";
    productPrice.value = "";
    productCategory.value = "";
    productImage.value = "";

    saveProductBtn.textContent = "ADD PRODUCT";

    productForm.style.display = "none";

});
// =========================
// ADD PRODUCT
// =========================

// =========================
// ADD PRODUCT
// =========================

saveProductBtn.addEventListener("click", async () => {

    const name = productName.value.trim();
    const price = Number(productPrice.value);
    const category = productCategory.value;
    const file = productImage.files[0];

    if (!name || !price || !category) {
        alert("Please fill in all product details.");
        return;
    }

    // =========================
    // EDIT EXISTING PRODUCT
    // =========================

    if (editingProductId !== null) {

        const formData = new FormData();

        formData.append("name", name);
        formData.append("price", price);
        formData.append("category", category);

        // Only send an image if a new one was selected
        if (file) {
            formData.append("image", file);
        }

        try {

            const response = await fetch(
                `http://localhost:5000/api/products/${editingProductId}`,
                {
                    method: "PUT",

                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
                    },

                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {

                alert(
                    data.message ||
                    "Failed to update product."
                );

                return;
            }

            alert("Product updated successfully!");

            // Reset edit mode
            editingProductId = null;

            saveProductBtn.textContent = "ADD PRODUCT";

            productName.value = "";
            productPrice.value = "";
            productCategory.value = "";
            productImage.value = "";

            productForm.style.display = "none";

            // Reload products from database
            loadProducts();

        } catch (error) {

            console.error("Update error:", error);

            alert("Could not connect to the backend.");

        }

        return;
    }


    // =========================
    // ADD NEW PRODUCT
    // =========================

    if (!file) {

        alert("Please select a product image.");

        return;
    }

    const formData = new FormData();

    formData.append("name", name);
    formData.append("price", price);
    formData.append("category", category);
    formData.append("image", file);

    try {

        const response = await fetch(
            "http://localhost:5000/api/products",
            {
                method: "POST",

                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
                },

                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {

            alert(
                data.message ||
                "Failed to add product."
            );

            return;
        }

        displayAdminProduct({
            id: data.product.id,
            name: data.product.name,
            price: data.product.price,
            category: data.product.category,
            image:
                `http://localhost:5000${data.product.image_url}`
        });

        productName.value = "";
        productPrice.value = "";
        productCategory.value = "";
        productImage.value = "";

        productForm.style.display = "none";

        alert("Product added successfully!");

    } catch (error) {

        console.error("Error:", error);

        alert("Could not connect to the backend.");

    }

});


// =========================
// DISPLAY PRODUCT
// =========================

function displayAdminProduct(product) {

    const productCard = document.createElement("div");

    productCard.className = "admin-product-card";

    productCard.innerHTML = `

        <img
            src="${product.image}"
            alt="${product.name}"
            class="admin-product-image"
        >

        <div class="admin-product-info">

            <h3>${product.name}</h3>

            <p>Price: ${formatPrice(product.price)}</p>

            <p>Category: ${product.category}</p>

            <div class="admin-product-actions">

                <button
                    type="button"
                    class="edit-product-btn"
                >
                    EDIT
                </button>

                <button
                    type="button"
                    class="delete-product-btn"
                >
                    DELETE
                </button>

            </div>

        </div>
    `;


    const editButton =
    productCard.querySelector(".edit-product-btn");

    editButton.addEventListener("click", () => {

        editingProductId = product.id;

        productName.value = product.name;
        productPrice.value = product.price;
        productCategory.value = product.category;

        productImage.value = "";

        productForm.style.display = "block";

        saveProductBtn.textContent = "UPDATE PRODUCT";

        productForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });



    const deleteButton =
        productCard.querySelector(".delete-product-btn");

    deleteButton.addEventListener("click", async () => {

        const confirmDelete = confirm(
            `Are you sure you want to delete "${product.name}"?`
        );

        if (!confirmDelete) return;

        try {

            const response = await fetch(
                `http://localhost:5000/api/products/${product.id}`,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("adminToken")}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {

                alert(data.message || "Failed to delete product.");

                return;
            }

            productCard.remove();

            alert("Product deleted successfully.");

        } catch (error) {

            console.error("Delete error:", error);

            alert("Could not connect to the backend.");

        }

    });

    adminProducts.appendChild(productCard);
}


// =========================
// CHECK ADMIN LOGIN
// =========================

if (localStorage.getItem("adminToken")) {

    loginSection.style.display = "none";
    dashboardSection.style.display = "block";

} else {

    loginSection.style.display = "block";
    dashboardSection.style.display = "none";

}



// =========================
// LOAD PRODUCTS
// =========================

async function loadProducts() {

    try {

        const response = await fetch(
            "http://localhost:5000/api/products"
        );

        const products = await response.json();

        adminProducts.innerHTML = "";

        products.forEach(product => {

            displayAdminProduct({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                image: `http://localhost:5000${product.image_url}`
            });

        });

    } catch (error) {

        console.error("Error loading products:", error);

    }

}

loadProducts();




// =========================
// SHOW / HIDE CHANGE PASSWORD
// =========================

const showChangePasswordBtn =
    document.getElementById("show-change-password-btn");

const passwordChangeSection =
    document.getElementById("password-change-section");


showChangePasswordBtn.addEventListener("click", () => {

    const isHidden = passwordChangeSection.hidden;

    passwordChangeSection.hidden = !isHidden;
    showChangePasswordBtn.setAttribute("aria-expanded", String(isHidden));
    showChangePasswordBtn.textContent = isHidden
        ? "Hide Change Password"
        : "Change Admin Password";

});

// =========================
// CHANGE ADMIN PASSWORD
// =========================

const changePasswordForm =
    document.getElementById("change-password-form");

const currentPasswordInput =
    document.getElementById("current-password");

const newPasswordInput =
    document.getElementById("new-password");

const confirmPasswordInput =
    document.getElementById("confirm-password");

const passwordChangeMessage =
    document.getElementById("password-change-message");


changePasswordForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const currentPassword =
        currentPasswordInput.value;

    const newPassword =
        newPasswordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    if (newPassword !== confirmPassword) {

        passwordChangeMessage.textContent =
            "New passwords do not match.";

        return;
    }


    if (newPassword.length < 6) {

        passwordChangeMessage.textContent =
            "New password must be at least 6 characters.";

        return;
    }


    const token =
        localStorage.getItem("adminToken");


    try {

        const response = await fetch(
            "http://localhost:5000/api/admin/change-password",
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            passwordChangeMessage.textContent =
                data.message ||
                "Failed to change password.";

            return;
        }


        passwordChangeMessage.textContent =
            "Password changed successfully!";


        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";


    } catch (error) {

        console.error(
            "Change password error:",
            error
        );

        passwordChangeMessage.textContent =
            "Could not connect to the backend.";

    }

});
