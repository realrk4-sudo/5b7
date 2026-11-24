```javascript
// ========================================
// 5B MARKETPLACE - MAIN JAVASCRIPT
// ========================================

const db = window.db;

let currentUser = null;
let profile = null;
let products = [];
let cart = [];
let authMode = "login";
let activeCategory = "all";

// HELPERS
const $ = id => document.getElementById(id);

function money(value) {
    return "$" + Number(value || 0).toFixed(2);
}

function message(id, text) {
    if ($(id)) $(id).textContent = text;
}

function openModal(id) {
    $(id).classList.add("show");
}

function closeModal(id) {
    $(id).classList.remove("show");
}

// ========================================
// START WEBSITE
// ========================================

async function startWebsite() {
    if (!db) {
        $("productsGrid").innerHTML =
            "<p>Please check your Supabase configuration in config.js.</p>";
        return;
    }

    const { data } = await db.auth.getSession();

    currentUser = data.session?.user || null;

    await loadProfile();
    await loadProducts();

    db.auth.onAuthStateChange(async (event, session) => {
        currentUser = session?.user || null;

        await loadProfile();
        updateAccount();
    });

    updateAccount();
}

// ========================================
// USER PROFILE
// ========================================

async function loadProfile() {
    profile = null;

    if (!currentUser) return;

    const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (!error) profile = data;
}

function updateAccount() {
    $("loginBtn").textContent =
        currentUser ? "My Account" : "Login";

    $("signupBtn").style.display =
        currentUser ? "none" : "inline-block";

    $("sellerBtn").textContent =
        currentUser ? "Open Your Shop →" : "Become a Seller →";
}

// ========================================
// PRODUCTS
// ========================================

async function loadProducts() {
    const { data, error } = await db
        .from("products")
        .select("*, shops(name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        $("productsGrid").innerHTML =
            "<p>Could not load products. Check your database setup.</p>";
        return;
    }

    products = data || [];
    displayProducts();
}

function displayProducts() {
    const search = $("searchInput").value.toLowerCase();

    const filtered = products.filter(product => {
        const categoryMatch =
            activeCategory === "all" ||
            product.category.toLowerCase() === activeCategory;

        const searchMatch =
            product.name.toLowerCase().includes(search) ||
            (product.description || "").toLowerCase().includes(search);

        return categoryMatch && searchMatch;
    });

    $("productCount").textContent =
        filtered.length + " products";

    if (!filtered.length) {
        $("productsGrid").innerHTML =
            "<p>No products found.</p>";
        return;
    }

    $("productsGrid").innerHTML = filtered.map(product => `
        <div class="product-card">

            <img
                class="product-image"
                src="${product.image_url || 'https://placehold.co/400x300?text=5B+Product'}"
                alt="${product.name}"
            >

            <div class="product-info">

                <p>${product.shops?.name || "5B Seller"}</p>

                <h3>${product.name}</h3>

                <p>${product.description || ""}</p>

                <div class="product-price">
                    ${money(product.price)}
                </div>

                <button
                    class="add-cart"
                    onclick="addToCart('${product.id}')">
                    Add to Cart
                </button>

            </div>
        </div>
    `).join("");
}

// ========================================
// SEARCH AND CATEGORIES
// ========================================

$("searchInput").addEventListener("input", displayProducts);

$("searchBtn").addEventListener("click", displayProducts);

document.querySelectorAll(".category-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".category-btn")
            .forEach(btn => btn.classList.remove("active"));

        button.classList.add("active");

        activeCategory = button.dataset.category;

        displayProducts();
    });
});

// ========================================
// LOGIN AND SIGNUP
// ========================================

function setAuthMode(mode) {
    authMode = mode;

    $("authTitle").textContent =
        mode === "signup" ? "Create Account" : "Welcome Back";

    $("authDescription").textContent =
        mode === "signup"
        ? "Join the 5B Marketplace."
        : "Login to your account.";

    $("fullName").classList.toggle("hidden", mode !== "signup");

    $("fullName").required = mode === "signup";

    $("authSubmit").textContent =
        mode === "signup" ? "Create Account" : "Login";

    $("authSwitch").innerHTML =
        mode === "signup"
        ? 'Already have an account? <a href="#" id="switchAuth">Login</a>'
        : 'Don\'t have an account? <a href="#" id="switchAuth">Sign Up</a>';

    $("switchAuth").addEventListener("click", event => {
        event.preventDefault();
        setAuthMode(mode === "signup" ? "login" : "signup");
    });

    message("authMessage", "");
}

$("loginBtn").addEventListener("click", () => {
    if (currentUser) {
        alert("You are logged in as " + currentUser.email);
        return;
    }

    setAuthMode("login");
    openModal("authModal");
});

$("signupBtn").addEventListener("click", () => {
    setAuthMode("signup");
    openModal("authModal");
});

$("closeAuth").addEventListener("click", () => {
    closeModal("authModal");
});

$("authForm").addEventListener("submit", async event => {
    event.preventDefault();

    const email = $("email").value.trim();
    const password = $("password").value;
    const fullName = $("fullName").value.trim();

    message("authMessage", "Please wait...");

    let result;

    if (authMode === "signup") {
        result = await db.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName }
            }
        });
    } else {
        result = await db.auth.signInWithPassword({
            email,
            password
        });
    }

    if (result.error) {
        message("authMessage", result.error.message);
        return;
    }

    if (authMode === "signup" && !result.data.session) {
        message(
            "authMessage",
            "Account created! Check your email to confirm your account."
        );
        return;
    }

    currentUser = result.data.user;

    await loadProfile();

    updateAccount();

    closeModal("authModal");

    alert("Welcome to 5B!");
});

// ========================================
// SHOPPING CART
// ========================================

function addToCart(id) {
    const product = products.find(item => item.id === id);

    if (!product) return;

    const existing = cart.find(item => item.id === id);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            quantity: 1,
            shop_id: product.shop_id
        });
    }

    updateCart();

    alert("Product added to cart!");
}

function updateCart() {
    const count = cart.reduce(
        (total, item) => total + item.quantity, 0
    );

    $("cartCount").textContent = count;
}

$("cartBtn").addEventListener("click", () => {
    displayCart();
    openModal("cartModal");
});

$("closeCart").addEventListener("click", () => {
    closeModal("cartModal");
});

function displayCart() {
    if (!cart.length) {
        $("cartItems").innerHTML = "<p>Your cart is empty.</p>";
        $("cartTotal").textContent = "0.00";
        return;
    }

    $("cartItems").innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong>
                <p>${money(item.price)} × ${item.quantity}</p>
            </div>

            <button onclick="removeFromCart('${item.id}')">
                Remove
            </button>
        </div>
    `).join("");

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    $("cartTotal").textContent = total.toFixed(2);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);

    updateCart();
    displayCart();
}

// ========================================
// CHECKOUT AND ORDERS
// ========================================

$("checkoutBtn").addEventListener("click", checkout);

async function checkout() {
    if (!currentUser) {
        closeModal("cartModal");
        setAuthMode("login");
        openModal("authModal");
        alert("Please login before placing an order.");
        return;
    }

    if (!cart.length) return;

    const buyerName = prompt("Enter your full name:");
    if (!buyerName) return;

    const phone = prompt("Enter your phone number:");
    if (!phone) return;

    const address = prompt("Enter your delivery address:");
    if (!address) return;

    const payment = prompt(
        "Choose payment method: Cash on delivery, Mobile Money, Bank transfer"
    );

    if (!payment) return;

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    const { data: order, error } = await db
        .from("orders")
        .insert({
            buyer_id: currentUser.id,
            buyer_name: buyerName,
            phone: phone,
            delivery_address: address,
            payment_method: payment,
            total_amount: total,
            status: "pending"
        })
        .select()
        .single();

    if (error) {
        alert(error.message);
        return;
    }

    const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        seller_shop_id: item.shop_id
    }));

    const { error: itemError } = await db
        .from("order_items")
        .insert(orderItems);

    if (itemError) {
        alert("Order created, but product details could not be saved: " + itemError.message);
        return;
    }

    cart = [];
    updateCart();

    closeModal("cartModal");

    alert("Your order has been placed successfully!");

    await loadProducts();
}

// ========================================
// CREATE SELLER SHOP
// ========================================

$("sellerBtn").addEventListener("click", () => {
    if (!currentUser) {
        setAuthMode("login");
        openModal("authModal");
        alert("Login first to open your shop.");
        return;
    }

    openModal("sellerModal");
});

$("closeSeller").addEventListener("click", () => {
    closeModal("sellerModal");
});

$("sellerForm").addEventListener("submit", async event => {
    event.preventDefault();

    if (!currentUser) return;

    const name = $("shopName").value.trim();
    const description = $("shopDescription").value.trim();

    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    message("sellerMessage", "Creating your shop...");

    const { error } = await db
        .from("shops")
        .insert({
            owner_id: currentUser.id,
            name,
            slug,
            description
        });

    if (error) {
        message("sellerMessage", error.message);
        return;
    }

    message("sellerMessage", "Your shop has been created!");

    await loadProfile();

    updateAccount();

    alert("Congratulations! Your shop is now open.");

    closeModal("sellerModal");
});

// ========================================
// START
// ========================================

if (db) {
    startWebsite();
} else {
    $("productsGrid").innerHTML =
        "<p>Supabase is not connected. Check config.js.</p>";
}
```