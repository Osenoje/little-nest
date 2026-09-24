let products = [];

const featuredProducts = document.getElementById("featured-products");
const cartCount = document.getElementById("cart-count");
const cartButton = document.getElementById("cart-button");
const cartPanel = document.getElementById("cart-panel");
const closeCartBtn = document.getElementById("close-cart-btn");
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");


const viewAllProducts = document.getElementById("view-all-products");
const categoryItems = document.querySelectorAll(".featured-item");
const whatsappCheckoutBtn = document.getElementById("whatsapp-checkout-btn");

const formatPrice = (price) => new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2
}).format(price);


async function loadProducts() {
    try {
        const response = await fetch("http://localhost:5000/api/products");

        console.log("Response status:", response.status);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        console.log("Products from backend:", data);

        products = data.map(product => ({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            category: product.category,
            image: `http://localhost:5000${product.image_url}`
        }));

        console.log("Products loaded:", products);

        renderProduct();

    } catch (error) {
        console.error("PRODUCT LOADING ERROR:", error);

        featuredProducts.innerHTML =
            `<p class="no-search-results">Unable to load products.</p>`;
    }
}


function loadCart() {
    try {
        const savedCart = JSON.parse(
            localStorage.getItem("shoppingCart") || "[]"
        );

        if (!Array.isArray(savedCart)) return [];

        return savedCart
            .filter(item =>
                Number.isInteger(item.productId) &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0
            )
            .map(item => ({
                productId: item.productId,
                quantity: item.quantity
            }));

    } catch {
        return [];
    }
}

const cart = loadCart();
let cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);



function productCard(product) {
    return `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}">

            <div class="product-details">
                <h3>${product.name}</h3>
                <p>${formatPrice(product.price)}</p>

                <button
                    class="add-to-cart-btn"
                    type="button"
                    data-product-id="${product.id}"
                >
                    Add to cart
                </button>
            </div>
        </div>
    `;
}

function renderProduct(showAll = false) {

    const initialProductLimit = window.matchMedia("(max-width: 500px)").matches
        ? 4
        : 6;

    const productsToShow = showAll
        ? products
        : products.slice(0, initialProductLimit);

    featuredProducts.innerHTML = productsToShow.map(productCard).join("");
}

function searchProducts() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    if (!searchTerm) {
        renderProduct(false);
        return;
    }

    const matchingProducts = products.filter(product => {
        const searchableText = [product.name, product.category, product.price]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(searchTerm);
    });

    featuredProducts.innerHTML = matchingProducts.length
        ? matchingProducts.map(productCard).join("")
        : `<p class="no-search-results">No matching products found.</p>`;
}

function updateCartCount() {
    cartCount.textContent = cartItemCount;

    try {
        localStorage.setItem("shoppingCart", JSON.stringify(cart));
    } catch {
        // The cart still works for this visit if browser storage is unavailable.
    }
}

function renderCart() {

    if (cart.length === 0) {

        cartItems.innerHTML =
            `<p class="empty-cart">Your cart is empty.</p>`;

        cartTotal.textContent = "";

        return;
    }

    cartItems.innerHTML = cart.map(item => {

        const product = products.find(
            product => product.id === item.productId
        );

        if (!product) return "";

        return `
            <div class="cart-item">

                <img
                    src="${product.image}"
                    alt="${product.name}"
                >

                <div>
                    <h3>${product.name}</h3>

                    <p>
                        ${formatPrice(product.price)} &times; ${item.quantity}
                    </p>
                </div>

                <button
                    class="remove-from-cart-btn"
                    type="button"
                    data-product-id="${product.id}"
                    aria-label="Remove one ${product.name}"
                >
                    &minus;
                </button>

            </div>
        `;

    }).join("");

    const total = cart.reduce((sum, item) => {

        const product = products.find(
            product => product.id === item.productId
        );

        if (!product) return sum;

        return sum + (product.price * item.quantity);

    }, 0);

    cartTotal.textContent = `Total: ${formatPrice(total)}`;
}

function toggleCart(show) {
    cartPanel.hidden = !show;
    cartButton.setAttribute("aria-expanded", show);
    if (show) renderCart();
}

// Event delegation keeps Add to cart working after products are re-rendered.
featuredProducts.addEventListener("click", (event) => {

    const addToCartButton = event.target.closest(".add-to-cart-btn");

    if (!addToCartButton) return;

    const productId = Number(addToCartButton.dataset.productId);

    const cartItem = cart.find(
        item => item.productId === productId
    );

    if (cartItem) {

        cartItem.quantity += 1;

    } else {

        cart.push({
            productId: productId,
            quantity: 1
        });

    }

    cartItemCount += 1;

    updateCartCount();

    if (!cartPanel.hidden) {
        renderCart();
    }

});


cartButton.addEventListener("click", () => {
    toggleCart(cartPanel.hidden);
});

closeCartBtn.addEventListener("click", () => toggleCart(false));

cartItems.addEventListener("click", (event) => {

    const removeButton = event.target.closest(
        ".remove-from-cart-btn"
    );

    if (!removeButton) return;

    const productId = Number(
        removeButton.dataset.productId
    );

    const cartItem = cart.find(
        item => item.productId === productId
    );

    if (!cartItem) return;

    cartItem.quantity -= 1;

    cartItemCount -= 1;

    if (cartItem.quantity === 0) {

        cart.splice(
            cart.indexOf(cartItem),
            1
        );

    }

    updateCartCount();
    renderCart();

});

searchBtn.addEventListener("click", searchProducts);

searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchProducts();
});


viewAllProducts.addEventListener("click", () => {

    if (viewAllProducts.textContent.includes("View all")) {

        renderProduct(true);
        viewAllProducts.textContent = "Show featured products ←";

    } else {

        renderProduct(false);
        viewAllProducts.textContent = "View all products →";

    }
});



categoryItems.forEach(item => {

    item.addEventListener("click", () => {

        const category = item.querySelector("h3").textContent.trim();

        const filteredProducts = products.filter(product =>
            product.category && product.category.toLowerCase() === category.toLowerCase()
        );

        featuredProducts.innerHTML = filteredProducts.map(productCard).join("");

    });

});

whatsappCheckoutBtn.addEventListener("click", () => {

    if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    const whatsappNumber = "2349037648312";

    let message = "Hello Little Nest! 👋\n\n";
    message += "I would like to place an order:\n\n";

    cart.forEach(item => {

        const product = products.find(
            product => product.id === item.productId
        );

        if (!product) return;

        message += `• ${product.name} x${item.quantity} - ${formatPrice(product.price * item.quantity)}\n`;

    });

    const total = cart.reduce((sum, item) => {

        const product = products.find(
            product => product.id === item.productId
        );

        if (!product) return sum;

        return sum + (product.price * item.quantity);

    }, 0);

    message += `\nTotal: ${formatPrice(total)}`;

    message +=
        "\n\nPlease let me know how I can complete my order. Thank you!";

    const whatsappURL =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, "_blank");

});

loadProducts();
updateCartCount();
