const API_BASE = (() => {
  if (typeof window.CARA_API_BASE === "string" && window.CARA_API_BASE.trim()) {
    return window.CARA_API_BASE.replace(/\/$/, "");
  }
  const meta = document.querySelector('meta[name="cara-api-base"]');
  if (meta?.content?.trim()) return meta.content.trim().replace(/\/$/, "");
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:5000/api";
  }
  return "/api";
})();

function getOrCreateSessionId() {
  let sid = localStorage.getItem("cara_session_id");
  if (!sid) {
    sid = crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("cara_session_id", sid);
  }
  return sid;
}

function apiHeaders(extra = {}) {
  return { "X-Session-Id": getOrCreateSessionId(), ...extra };
}

const bar = document.getElementById("bar");
const close = document.getElementById("close");
const nav = document.getElementById("navbar");
let cachedProducts = [];

if (bar) bar.addEventListener("click", () => nav.classList.add("active"));
if (close) close.addEventListener("click", () => nav.classList.remove("active"));

const LOCAL_STORE_KEYS = {
  products: "cara_products",
  cart: "cara_cart",
  newsletter: "cara_newsletter",
  contacts: "cara_contacts",
  users: "cara_users",
  addresses: "cara_addresses",
  orders: "cara_orders",
};

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Apple iPhone 15 (Blue, 128 GB)", brand: "Apple", price: 79900, image: "img/products/f1.jpg", stock: 25, description: "6.1-inch Super Retina XDR, A16 Bionic, dual camera, USB-C.", category: "Mobiles" },
  { id: 2, name: "boAt Rockerz 450 Bluetooth On-Ear Headphones", brand: "boAt", price: 1499, image: "img/products/f2.jpg", stock: 200, description: "40mm drivers, up to 15 hours playback, lightweight foldable design.", category: "Electronics" },
  { id: 3, name: "Tata Tea Gold, 500g", brand: "Tata", price: 285, image: "img/products/f3.jpg", stock: 500, description: "Premium blend with long leaves for a strong, refreshing cup.", category: "Grocery" },
  { id: 4, name: "Samsung Galaxy M34 5G (8GB RAM, 128GB)", brand: "Samsung", price: 18999, image: "img/products/f4.jpg", stock: 60, description: "120Hz AMOLED, 6000mAh battery, 50MP triple camera.", category: "Mobiles" },
  { id: 5, name: "Prestige Popular Svachh Aluminium Pressure Cooker 5 L", brand: "Prestige", price: 2495, image: "img/products/f5.jpg", stock: 80, description: "Gas and induction compatible, deep lid controls spillage.", category: "Home & Kitchen" },
  { id: 6, name: "Lux Velvet Touch Soap Pack of 3", brand: "Lux", price: 235, image: "img/products/f6.jpg", stock: 300, description: "Fragrant bathing bars with moisturizing benefits.", category: "Beauty" },
  { id: 7, name: "Philips Air Fryer HD9252/90 (4.1 L)", brand: "Philips", price: 8999, image: "img/products/f7.jpg", stock: 40, description: "Rapid Air technology, digital display, preset recipes.", category: "Home & Kitchen" },
  { id: 8, name: "MI Power Bank 3i 20000mAh (18W Fast Charging)", brand: "Mi", price: 2199, image: "img/products/f8.jpg", stock: 150, description: "Dual USB output, Type-C, BIS certified.", category: "Electronics" },
  { id: 9, name: "Puma Unisex Softride Running Shoes", brand: "Puma", price: 3499, image: "img/products/n1.jpg", stock: 90, description: "Cushioned midsole, breathable mesh upper.", category: "Fashion" },
  { id: 10, name: "Dettol Antiseptic Liquid 1 L", brand: "Dettol", price: 289, image: "img/products/n2.jpg", stock: 400, description: "First-aid, surface cleaning, and personal hygiene.", category: "Health" },
];

const LOCAL_COUPONS = { SAVE10: 10, WELCOME20: 20 };

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureLocalSeed() {
  if (!readLocal(LOCAL_STORE_KEYS.products, null)) writeLocal(LOCAL_STORE_KEYS.products, DEFAULT_PRODUCTS);
  if (!readLocal(LOCAL_STORE_KEYS.cart, null)) writeLocal(LOCAL_STORE_KEYS.cart, []);
  if (!readLocal(LOCAL_STORE_KEYS.newsletter, null)) writeLocal(LOCAL_STORE_KEYS.newsletter, []);
  if (!readLocal(LOCAL_STORE_KEYS.contacts, null)) writeLocal(LOCAL_STORE_KEYS.contacts, []);
  if (!readLocal(LOCAL_STORE_KEYS.users, null)) writeLocal(LOCAL_STORE_KEYS.users, []);
  if (!readLocal(LOCAL_STORE_KEYS.addresses, null)) writeLocal(LOCAL_STORE_KEYS.addresses, []);
  if (!readLocal(LOCAL_STORE_KEYS.orders, null)) writeLocal(LOCAL_STORE_KEYS.orders, []);
}

function getLocalCartSummary() {
  const products = readLocal(LOCAL_STORE_KEYS.products, DEFAULT_PRODUCTS);
  const cart = readLocal(LOCAL_STORE_KEYS.cart, []);
  const items = cart
    .map((row) => {
      const p = products.find((product) => product.id === row.product_id);
      if (!p) return null;
      return { id: row.id, product_id: row.product_id, quantity: row.quantity, name: p.name, price: p.price, image: p.image };
    })
    .filter(Boolean);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items, subtotal };
}

function withJsonBody(options = {}) {
  if (!options.body) return {};
  try {
    return JSON.parse(options.body);
  } catch (_error) {
    return {};
  }
}

async function localApiRequest(path, options = {}) {
  ensureLocalSeed();
  const method = (options.method || "GET").toUpperCase();
  const payload = withJsonBody(options);
  const parts = path.split("/").filter(Boolean);

  if (path === "/products" && method === "GET") return readLocal(LOCAL_STORE_KEYS.products, DEFAULT_PRODUCTS);
  if (parts[0] === "products" && parts[1] && method === "GET") {
    const pid = Number(parts[1]);
    const products = readLocal(LOCAL_STORE_KEYS.products, DEFAULT_PRODUCTS);
    const p = products.find((item) => item.id === pid);
    if (!p) throw new Error("Product not found");
    return { ...p, description: p.description || "", category: p.category || "General" };
  }
  if (path === "/cart" && method === "GET") return getLocalCartSummary();

  if (path === "/cart" && method === "POST") {
    const productId = Number(payload.product_id);
    const quantity = Math.max(1, Number(payload.quantity || 1));
    const products = readLocal(LOCAL_STORE_KEYS.products, DEFAULT_PRODUCTS);
    const cart = readLocal(LOCAL_STORE_KEYS.cart, []);
    const product = products.find((item) => item.id === productId);
    if (!product) throw new Error("Product does not exist");
    const existing = cart.find((item) => item.product_id === productId);
    const totalQty = quantity + (existing?.quantity || 0);
    if (totalQty > Number(product.stock || 10)) throw new Error(`Only ${product.stock || 10} item(s) in stock`);
    if (existing) existing.quantity = totalQty;
    else cart.push({ id: Date.now(), product_id: productId, quantity });
    writeLocal(LOCAL_STORE_KEYS.cart, cart);
    return getLocalCartSummary();
  }

  if (parts[0] === "cart" && parts[1] && method === "DELETE") {
    const itemId = Number(parts[1]);
    const cart = readLocal(LOCAL_STORE_KEYS.cart, []);
    const updated = cart.filter((item) => item.id !== itemId);
    writeLocal(LOCAL_STORE_KEYS.cart, updated);
    return getLocalCartSummary();
  }

  if (parts[0] === "cart" && parts[1] && method === "PATCH") {
    const itemId = Number(parts[1]);
    const quantity = Math.max(1, Number(payload.quantity || 1));
    const products = readLocal(LOCAL_STORE_KEYS.products, DEFAULT_PRODUCTS);
    const cart = readLocal(LOCAL_STORE_KEYS.cart, []);
    const target = cart.find((item) => item.id === itemId);
    if (!target) throw new Error("Cart item not found");
    const product = products.find((item) => item.id === target.product_id);
    if (product && quantity > Number(product.stock || 10)) throw new Error(`Only ${product.stock || 10} item(s) in stock`);
    target.quantity = quantity;
    writeLocal(LOCAL_STORE_KEYS.cart, cart);
    return getLocalCartSummary();
  }

  if (path === "/cart/apply-coupon" && method === "POST") {
    const code = String(payload.code || "").trim().toUpperCase();
    const summary = getLocalCartSummary();
    if (!LOCAL_COUPONS[code]) throw new Error("Invalid coupon");
    const percent = LOCAL_COUPONS[code];
    const discount_amount = Math.round(summary.subtotal * (percent / 100));
    const total = summary.subtotal - discount_amount;
    return { ...summary, coupon: { code, discount_percent: percent }, discount_amount, total };
  }

  if (path === "/newsletter" && method === "POST") {
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    const list = readLocal(LOCAL_STORE_KEYS.newsletter, []);
    if (!list.includes(email)) list.push(email);
    writeLocal(LOCAL_STORE_KEYS.newsletter, list);
    return { message: "Subscribed successfully" };
  }

  if (path === "/contact" && method === "POST") {
    const name = String(payload.name || "").trim();
    const email = String(payload.email || "").trim();
    const message = String(payload.message || "").trim();
    if (!name || !email || !message) throw new Error("name, email, and message are required");
    const messages = readLocal(LOCAL_STORE_KEYS.contacts, []);
    messages.push({ ...payload, created_at: new Date().toISOString() });
    writeLocal(LOCAL_STORE_KEYS.contacts, messages);
    return { message: "Message received" };
  }

  if (path === "/auth/signup" && method === "POST") {
    const full_name = String(payload.full_name || "").trim();
    const email = String(payload.email || "").trim().toLowerCase();
    const mobile = String(payload.mobile || "").trim();
    const password = String(payload.password || "");
    if (!full_name || !email || !mobile || !password) throw new Error("full_name, email, mobile, password are required");
    const users = readLocal(LOCAL_STORE_KEYS.users, []);
    if (users.some((u) => u.email === email || u.mobile === mobile)) throw new Error("User already exists with this email or mobile");
    const user = { user_id: Date.now(), full_name, email, mobile, password };
    users.push(user);
    writeLocal(LOCAL_STORE_KEYS.users, users);
    return { user_id: user.user_id, full_name, email, mobile };
  }

  if (path === "/auth/login" && method === "POST") {
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const users = readLocal(LOCAL_STORE_KEYS.users, []);
    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) throw new Error("Invalid credentials");
    return { user_id: user.user_id, full_name: user.full_name, email: user.email, mobile: user.mobile };
  }

  if (path === "/addresses" && method === "POST") {
    const addresses = readLocal(LOCAL_STORE_KEYS.addresses, []);
    const record = { ...payload, id: Date.now(), created_at: new Date().toISOString() };
    addresses.push(record);
    writeLocal(LOCAL_STORE_KEYS.addresses, addresses);
    return { address_id: record.id, message: "Address saved" };
  }

  if (parts[0] === "addresses" && parts[1] === "latest" && parts[2] && method === "GET") {
    const userId = Number(parts[2]);
    const addresses = readLocal(LOCAL_STORE_KEYS.addresses, []);
    const row = [...addresses].reverse().find((item) => Number(item.user_id) === userId);
    if (!row) throw new Error("No address found");
    return row;
  }

  if (path === "/checkout" && method === "POST") {
    const summary = getLocalCartSummary();
    if (!summary.items.length) throw new Error("Cart is empty");
    const pincode = String(payload.pincode || "").trim();
    const state = String(payload.state || "").trim();
    if (!/^\d{6}$/.test(pincode)) throw new Error("Valid 6-digit pincode required");
    if (!state) throw new Error("State is required");
    const orders = readLocal(LOCAL_STORE_KEYS.orders, []);
    const transaction_id = `UPI-NPCI-${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
    const order = {
      order_id: Date.now(),
      status: "placed",
      total: summary.subtotal,
      transaction_id,
      success: true,
      ...payload,
    };
    orders.push(order);
    writeLocal(LOCAL_STORE_KEYS.orders, orders);
    writeLocal(LOCAL_STORE_KEYS.cart, []);
    return order;
  }

  throw new Error("This feature is not available right now.");
}

async function apiRequest(path, options = {}) {
  const requestConfig = {
    headers: { "Content-Type": "application/json", ...apiHeaders(), ...(options.headers || {}) },
    ...options,
  };
  try {
    const response = await fetch(`${API_BASE}${path}`, requestConfig);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.error) throw new Error(data.error);
      throw new Error("Primary API unavailable");
    }
    return data;
  } catch (error) {
    return localApiRequest(path, options).catch((localError) => {
      throw new Error(localError.message || error.message || "Request failed");
    });
  }
}

function showMessage(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "api-toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

async function loadProductsIntoCards() {
  const cards = Array.from(document.querySelectorAll(".pro-container .pro"));
  try {
    cachedProducts = await apiRequest("/products");
    if (!cachedProducts.length) return;
    const hasCategoryFilters = Boolean(document.getElementById("category-filters"));
    if (hasCategoryFilters) return;
    if (!cards.length) return;
    cards.forEach((card, index) => {
      const product = cachedProducts[index % cachedProducts.length];
      if (!product) return;
      card.dataset.productId = String(product.id);
      card.dataset.category = String(product.category || "General");
      const img = card.querySelector("img");
      const brand = card.querySelector(".des span");
      const title = card.querySelector(".des h5");
      const price = card.querySelector(".des h4");
      if (img) img.src = product.image;
      if (brand) brand.textContent = product.brand;
      if (title) title.textContent = product.name;
      if (price) price.textContent = formatINR(product.price);
    });
  } catch (_error) {}
}

function renderShopProducts(category = "All") {
  const container = document.querySelector("#product1 .pro-container");
  const hasCategoryFilters = Boolean(document.getElementById("category-filters"));
  if (!container || !hasCategoryFilters) return;
  const list = Array.isArray(cachedProducts) ? cachedProducts : [];
  const filtered =
    category === "All"
      ? list
      : list.filter((item) => String(item.category || "").toLowerCase() === String(category).toLowerCase());

  container.innerHTML = filtered
    .map(
      (product) => `
      <div class="pro" data-product-id="${product.id}" data-category="${String(product.category || "General")}">
        <img class="shirt" src="${product.image}" alt="${product.name}">
        <div class="des">
          <span>${product.brand}</span>
          <h5>${product.name}</h5>
          <div class="star">
            <i class='bx bxs-star' ></i>
            <i class='bx bxs-star' ></i>
            <i class='bx bxs-star' ></i>
            <i class='bx bxs-star' ></i>
            <i class='bx bxs-star' ></i>
          </div>
          <h4>${formatINR(product.price)}</h4>
        </div>
        <a href="#"><i class='bx bx-cart cart' ></i></a>
      </div>`
    )
    .join("");

  setupProductCardNavigation();
  setupAddToCartButtons();
  decorateProductCards();
}

function setupCategoryFilters() {
  const wrap = document.getElementById("category-filters");
  if (!wrap) return;
  const chips = Array.from(wrap.querySelectorAll(".cat-chip"));
  if (!chips.length) return;

  const apply = (category) => {
    const cat = String(category || "All");
    renderShopProducts(cat);
    const visible = cat === "All"
      ? cachedProducts.length
      : cachedProducts.filter((item) => String(item.category || "").toLowerCase() === cat.toLowerCase()).length;
    chips.forEach((chip) => chip.classList.toggle("active", chip.dataset.category === cat));
    showMessage(visible ? `Showing ${visible} item(s).` : "No items in this category.");
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => apply(chip.dataset.category));
  });
  apply("All");
}

function resolveProductId(productCard) {
  const directId = Number(productCard?.dataset.productId);
  if (directId) return directId;
  const title = productCard?.querySelector(".des h5")?.textContent?.trim()?.toLowerCase();
  const matched = cachedProducts.find((item) => item.name.toLowerCase() === title);
  return matched?.id || null;
}

function setupAddToCartButtons() {
  const addToCartLinks = document.querySelectorAll(".pro a");
  if (!addToCartLinks.length) return;
  addToCartLinks.forEach((link) => {
    link.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const productId = resolveProductId(link.closest(".pro"));
      if (!productId) {
        showMessage("Could not identify this product. Refresh once.");
        return;
      }
      try {
        await apiRequest("/cart", {
          method: "POST",
          body: JSON.stringify({ product_id: productId, quantity: 1 }),
        });
        showMessage("Added to cart.");
        updateCartBadge();
      } catch (error) {
        showMessage(error.message === "Product is out of stock" ? "Product not available (stock 0)." : error.message);
      }
    });
  });
}

function getCartElements() {
  return {
    cartBody: document.querySelector("#cart tbody"),
    couponInput: document.querySelector("#coupon input"),
    couponButton: document.querySelector("#coupon button"),
    subtotalCell: document.querySelector("#subtotal table tr:nth-child(1) td:nth-child(2)"),
    totalCell: document.querySelector("#subtotal table tr:nth-child(3) td:nth-child(2)"),
    checkoutButton: document.querySelector("#subtotal .normal"),
  };
}

function renderCartRows(items) {
  const { cartBody } = getCartElements();
  if (!cartBody) return;
  if (!items.length) {
    cartBody.innerHTML = '<tr><td colspan="6">Your cart is empty.</td></tr>';
    return;
  }
  cartBody.innerHTML = items
    .map(
      (item) => `<tr data-cart-id="${item.id}">
        <td><button class="remove-item" type="button"><i class='bx bx-x-circle'></i></button></td>
        <td><img src="./${item.image}" alt="${item.name}"></td>
        <td>${item.name}</td>
        <td>${formatINR(item.price)}</td>
        <td><input class="qty-input" type="number" min="1" value="${item.quantity}"></td>
        <td>${formatINR(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");
}

function renderCartTotals(subtotal, total) {
  const { subtotalCell, totalCell } = getCartElements();
  if (subtotalCell) subtotalCell.textContent = formatINR(subtotal);
  if (totalCell) totalCell.textContent = formatINR(total ?? subtotal);
}

async function refreshCart() {
  const summary = await apiRequest("/cart");
  renderCartRows(summary.items);
  renderCartTotals(summary.subtotal, summary.subtotal);
  const checkoutTotal = document.getElementById("checkout-total");
  if (checkoutTotal) checkoutTotal.textContent = formatINR(summary.subtotal);
  updateCartBadge();
  return summary;
}

function setupCartInteractions() {
  const { cartBody, couponButton, couponInput, checkoutButton } = getCartElements();
  if (!cartBody) return;
  refreshCart().catch((error) => showMessage(error.message));

  cartBody.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-item");
    if (!removeButton) return;
    const itemId = Number(removeButton.closest("tr")?.dataset.cartId);
    if (!itemId) return;
    try {
      await apiRequest(`/cart/${itemId}`, { method: "DELETE" });
      await refreshCart();
    } catch (error) {
      showMessage(error.message);
    }
  });

  cartBody.addEventListener("change", async (event) => {
    const qtyInput = event.target.closest(".qty-input");
    if (!qtyInput) return;
    const itemId = Number(qtyInput.closest("tr")?.dataset.cartId);
    const quantity = Math.max(1, Number(qtyInput.value || 1));
    qtyInput.value = String(quantity);
    try {
      await apiRequest(`/cart/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      await refreshCart();
    } catch (error) {
      showMessage(error.message);
    }
  });

  if (couponButton && couponInput) {
    couponButton.addEventListener("click", async () => {
      const code = couponInput.value.trim();
      if (!code) return showMessage("Enter a coupon code.");
      try {
        const result = await apiRequest("/cart/apply-coupon", { method: "POST", body: JSON.stringify({ code }) });
        renderCartRows(result.items);
        renderCartTotals(result.subtotal, result.total);
        showMessage(`Coupon applied: ${result.coupon.discount_percent}% off`);
      } catch (error) {
        showMessage(error.message);
      }
    });
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }
}

function setupContactForm() {
  const form = document.querySelector("#form-details form");
  if (!form) return;
  const [nameInput, emailInput, subjectInput, messageInput] = form.querySelectorAll("input, textarea");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: nameInput?.value?.trim() || "",
          email: emailInput?.value?.trim() || "",
          subject: subjectInput?.value?.trim() || "",
          message: messageInput?.value?.trim() || "",
        }),
      });
      form.reset();
      showMessage("Message sent successfully.");
    } catch (error) {
      showMessage(error.message);
    }
  });
}

function setupNewsletterForms() {
  document.querySelectorAll("#newsletter .form").forEach((section) => {
    const input = section.querySelector("input");
    const button = section.querySelector("button");
    if (!input || !button) return;
    button.addEventListener("click", async () => {
      const email = input.value.trim();
      if (!email) return showMessage("Please enter your email.");
      try {
        const result = await apiRequest("/newsletter", { method: "POST", body: JSON.stringify({ email }) });
        showMessage(result.message || "Subscribed successfully.");
        input.value = "";
      } catch (error) {
        showMessage(error.message);
      }
    });
  });
}

function setupIndianAuth() {
  const authForm = document.querySelector("#auth-form");
  if (!authForm) return;
  const modeSelect = document.getElementById("auth-mode");
  const submitBtn = document.getElementById("auth-submit-btn");
  const fullNameInput = document.getElementById("full-name-auth");
  const emailInput = document.getElementById("email-auth");
  const mobileInput = document.getElementById("mobile-number");
  const passwordInput = document.getElementById("password-auth");

  const updateModeUI = () => {
    const mode = modeSelect?.value || "login";
    if (submitBtn) submitBtn.textContent = mode === "signup" ? "Create Account" : "Login";
    if (fullNameInput) fullNameInput.required = mode === "signup";
    if (mobileInput) mobileInput.required = mode === "signup";
  };
  if (modeSelect) {
    modeSelect.addEventListener("change", updateModeUI);
    updateModeUI();
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const mode = modeSelect?.value || "login";
    const full_name = fullNameInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";
    const mobile = mobileInput?.value?.trim() || "";
    const password = passwordInput?.value || "";

    if (mode === "signup" && !/^\d{10}$/.test(mobile)) return showMessage("Enter a valid 10-digit mobile number.");
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const payload = mode === "signup" ? { full_name, email, mobile, password } : { email, password };
      const user = await apiRequest(endpoint, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("currentUser", JSON.stringify(user));
      showMessage(mode === "signup" ? "Account created successfully." : "Logged in successfully.");
      window.location.href = "index.html";
    } catch (error) {
      showMessage(error.message);
    }
  });
}

function setupCheckoutPage() {
  const form = document.getElementById("checkout-form");
  if (!form) return;
  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  refreshCart().catch(() => {});

  if (user.user_id) {
    apiRequest(`/addresses/latest/${user.user_id}`)
      .then((addr) => {
        const mapping = {
          "full-name": addr.full_name,
          email: addr.email,
          "checkout-mobile": addr.mobile,
          pincode: addr.pincode,
          locality: addr.locality,
          city: addr.city,
          state: addr.state,
          landmark: addr.landmark || "",
        };
        Object.entries(mapping).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el && value) el.value = value;
        });
      })
      .catch(() => {});
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const pincode = document.getElementById("pincode")?.value?.trim() || "";
    if (!/^\d{6}$/.test(pincode)) return showMessage("Enter a valid 6-digit pincode.");
    const payload = {
      customer_name: document.getElementById("full-name")?.value?.trim() || "",
      customer_email: document.getElementById("email")?.value?.trim() || "",
      mobile: document.getElementById("checkout-mobile")?.value?.trim() || "",
      pincode,
      locality: document.getElementById("locality")?.value?.trim() || "",
      city: document.getElementById("city")?.value?.trim() || "",
      state: document.getElementById("state")?.value || "",
      landmark: document.getElementById("landmark")?.value?.trim() || "",
    };
    if (!/^\d{10}$/.test(payload.mobile)) return showMessage("Enter a valid 10-digit mobile number.");
    if (!user.user_id) return showMessage("Please login first to continue checkout.");

    try {
      await apiRequest("/addresses", {
        method: "POST",
        body: JSON.stringify({ user_id: user.user_id, ...payload }),
      });
    } catch (error) {
      return showMessage(error.message);
    }

    localStorage.setItem("checkoutDetails", JSON.stringify(payload));
    window.location.href = "payment.html";
  });
}

function setupPaymentPage() {
  const payBtn = document.getElementById("simulate-payment-success");
  if (!payBtn) return;
  refreshCart().catch(() => {});
  payBtn.addEventListener("click", async () => {
    const details = JSON.parse(localStorage.getItem("checkoutDetails") || "{}");
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    try {
      const order = await apiRequest("/checkout", {
        method: "POST",
        body: JSON.stringify({
          customer_name: details.customer_name || "Guest User",
          customer_email: details.customer_email || "guest@example.com",
          mobile: details.mobile || "",
          pincode: details.pincode || "",
          locality: details.locality || "",
          city: details.city || "",
          state: details.state || "",
          landmark: details.landmark || "",
          payment_method: "UPI",
          user_id: user.user_id || null,
        }),
      });
      localStorage.setItem("lastOrder", JSON.stringify(order));
      window.location.href = "order-confirmed.html";
    } catch (error) {
      showMessage(error.message);
    }
  });
}

function setupOrderConfirmedPage() {
  const box = document.getElementById("order-confirmed-box");
  if (!box) return;
  const order = JSON.parse(localStorage.getItem("lastOrder") || "{}");
  if (order.order_id) {
    const txn = order.transaction_id ? `<p>Transaction ID: <strong>${order.transaction_id}</strong></p>` : "";
    const ordNo = order.order_number ? `<p>Order No: <strong>${order.order_number}</strong></p>` : "";
    box.innerHTML = `<h2>Order Confirmed</h2><p>Order ID: <strong>#${order.order_id}</strong></p>${ordNo}${txn}<p>Total Paid: <strong>${formatINR(order.total)}</strong></p><a class="normal" href="shop.html">Continue Shopping</a>`;
  }
}

function injectIndianFooterNote() {
  const footerCopyright = document.querySelector("footer .copyright");
  if (!footerCopyright || document.getElementById("india-footer-note")) return;
  const note = document.createElement("p");
  note.id = "india-footer-note";
  note.textContent = "Made with ❤️ in India | Support: +91-9876543210";
  footerCopyright.appendChild(note);
}

function setupNavbarAuthState() {
  const loginAnchor = document.querySelector('a[href="login.html"]');
  if (!loginAnchor) return;
  const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const existingLogout = document.getElementById("logout-link");

  if (user?.user_id && user?.full_name) {
    loginAnchor.textContent = `Hi, ${user.full_name.split(" ")[0]}`;
    if (!existingLogout) {
      const logoutLi = document.createElement("li");
      const logoutA = document.createElement("a");
      logoutA.href = "#";
      logoutA.id = "logout-link";
      logoutA.textContent = "Logout";
      logoutA.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("currentUser");
        localStorage.removeItem("checkoutDetails");
        showMessage("Logged out successfully.");
        window.location.reload();
      });
      logoutLi.appendChild(logoutA);
      loginAnchor.closest("li")?.insertAdjacentElement("afterend", logoutLi);
    }
  } else {
    loginAnchor.textContent = "Login";
    if (existingLogout) {
      existingLogout.closest("li")?.remove();
    }
  }
}

function injectAmazonStyleSearch() {
  const header = document.getElementById("header");
  const navbar = document.getElementById("navbar");
  if (!header || !navbar || document.getElementById("amazon-search-wrap")) return;

  const wrap = document.createElement("div");
  wrap.id = "amazon-search-wrap";
  wrap.innerHTML = `
    <input id="amazon-search-input" type="search" placeholder="Search products, brands and categories" />
    <button id="amazon-search-btn" type="button"><i class='bx bx-search'></i></button>
  `;
  header.insertBefore(wrap, header.children[1] || null);

  const searchInput = document.getElementById("amazon-search-input");
  const searchBtn = document.getElementById("amazon-search-btn");

  const runSearch = () => {
    const keyword = String(searchInput?.value || "").trim().toLowerCase();
    if (!keyword) return;
    const products = document.querySelectorAll(".pro-container .pro");
    if (!products.length) {
      window.location.href = `shop.html?search=${encodeURIComponent(keyword)}`;
      return;
    }
    let matches = 0;
    products.forEach((product) => {
      const text = product.textContent.toLowerCase();
      const visible = text.includes(keyword);
      product.style.display = visible ? "" : "none";
      if (visible) matches += 1;
    });
    showMessage(matches ? `Showing ${matches} result(s).` : "No product matched your search.");
  };

  if (searchBtn) searchBtn.addEventListener("click", runSearch);
  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        runSearch();
      }
    });
  }
}

function injectAmazonUtilityBar() {
  const header = document.getElementById("header");
  if (!header || document.getElementById("amazon-utility-bar")) return;
  const bar = document.createElement("section");
  bar.id = "amazon-utility-bar";
  bar.innerHTML = `
    <div class="utility-left">
      <span class="utility-chip">Deliver to India</span>
      <span class="utility-chip">Prime Deals</span>
    </div>
    <div class="utility-cats">
      <a href="shop.html">Today's Deals</a>
      <a href="shop.html">Mobiles</a>
      <a href="shop.html">Fashion</a>
      <a href="shop.html">Electronics</a>
      <a href="shop.html">Home</a>
    </div>
  `;
  header.insertAdjacentElement("afterend", bar);
}

function decorateProductCards() {
  const cards = document.querySelectorAll(".pro-container .pro");
  if (!cards.length) return;
  cards.forEach((card, index) => {
    if (!card.querySelector(".amz-badge-row")) {
      const row = document.createElement("div");
      row.className = "amz-badge-row";
      const stock = (index % 4) + 2;
      row.innerHTML = `<span class="amz-prime">Prime</span><span class="amz-stock">Only ${stock} left</span>`;
      const des = card.querySelector(".des");
      if (des) des.appendChild(row);
    }
  });
}

function injectCartBadge() {
  document.querySelectorAll('a[href="cart.html"]').forEach((bag) => {
    if (bag.querySelector(".cart-count-badge")) return;
    bag.style.position = "relative";
    const badge = document.createElement("span");
    badge.className = "cart-count-badge";
    badge.setAttribute("aria-label", "Items in cart");
    bag.appendChild(badge);
  });
}

async function updateCartBadge() {
  try {
    const summary = await apiRequest("/cart");
    const n = (summary.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    document.querySelectorAll(".cart-count-badge").forEach((el) => {
      el.textContent = n > 0 ? String(n) : "";
      el.classList.toggle("has-items", n > 0);
    });
  } catch (_e) {}
}

function setupProductCardNavigation() {
  document.querySelectorAll(".pro-container .pro").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".pro > a")) return;
      const productId = resolveProductId(card);
      if (productId) {
        window.location.href = `sproduct.html?id=${productId}`;
      }
    });
  });
}

async function setupProductDetailPage() {
  const root = document.getElementById("prodetails");
  if (!root) return;
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get("id") || 0);
  if (!id) {
    showMessage("Open a product from the shop.");
    return;
  }
  let product;
  try {
    product = await apiRequest(`/products/${id}`);
  } catch (e) {
    showMessage(e.message || "Product not found");
    return;
  }
  const main = document.getElementById("MainImg");
  const bc = document.getElementById("pdp-breadcrumb");
  const title = document.getElementById("pdp-title");
  const price = document.getElementById("pdp-price");
  const desc = document.getElementById("pdp-description");
  if (main) {
    main.src = product.image;
    main.alt = product.name;
  }
  if (bc) bc.textContent = `Home / ${product.category || "Shop"} / ${product.brand}`;
  if (title) title.textContent = product.name;
  if (price) price.textContent = formatINR(product.price);
  if (desc) desc.textContent = product.description || "Quality product with pan-India delivery options.";

  const thumbs = document.getElementById("pdp-thumbs");
  if (thumbs) {
    thumbs.innerHTML = [0, 1, 2, 3]
      .map(
        () =>
          `<div class="small-img-col"><img src="${product.image}" width="100%" class="small-img" alt=""></div>`
      )
      .join("");
    thumbs.querySelectorAll(".small-img").forEach((img) => {
      img.addEventListener("click", () => {
        if (main) main.src = img.src;
      });
    });
  }

  const addBtn = document.getElementById("pdp-add-cart");
  if (addBtn) {
    addBtn.addEventListener("click", async () => {
      const qtyInput = document.getElementById("pdp-qty");
      const qty = Math.max(1, Number(qtyInput?.value || 1));
      try {
        await apiRequest("/cart", {
          method: "POST",
          body: JSON.stringify({ product_id: id, quantity: qty }),
        });
        showMessage("Added to cart.");
        updateCartBadge();
      } catch (error) {
        showMessage(error.message);
      }
    });
  }
  document.title = `${product.name} | Cara India`;
}

document.addEventListener("DOMContentLoaded", async () => {
  injectCartBadge();
  await loadProductsIntoCards();
  setupCategoryFilters();
  if (!document.getElementById("category-filters")) {
    setupProductCardNavigation();
    setupAddToCartButtons();
  }
  await setupProductDetailPage();
  setupCartInteractions();
  setupContactForm();
  setupNewsletterForms();
  setupIndianAuth();
  setupCheckoutPage();
  setupPaymentPage();
  setupOrderConfirmedPage();
  injectIndianFooterNote();
  setupNavbarAuthState();
  injectAmazonStyleSearch();
  injectAmazonUtilityBar();
  decorateProductCards();
  updateCartBadge();
});