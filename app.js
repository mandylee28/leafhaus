/* Leafhaus — tea drink ordering app.
   No build step. Menu, stores and vouchers load from Supabase (hosted
   PostgreSQL) when config.js holds a real project URL and anon key.
   Without that config the app falls back to the built-in lists and stores
   orders in localStorage on this device only. */

"use strict";

/* ---------- Built-in data (fallback when Supabase is not configured,
   and while the database lists are loading) ---------- */
var STORES = [
  "Leafhaus MY Horizon Mall",
  "Leafhaus MY Eco Botanic",
  "Leafhaus MY Aeon Bukit Indah"
];

var CATEGORIES = ["All", "Milk Tea", "Pure Tea", "Fruit Tea", "Matcha"];

var VOUCHERS = {
  WELCOME50: 0.5,
  TEA20: 0.2,
  LEAF10: 0.1
};

var DRINKS = [
  { id: 1, name: "Jasmine Matcha Pure Tea", price: 11.90, category: "Matcha",
    desc: "Jasmine green tea with matcha", color: "#7a9b57", bg: "#eef3e4" },
  { id: 2, name: "Jasmine Green Milk Tea", price: 12.90, category: "Milk Tea",
    desc: "Jasmine green tea, fresh milk", color: "#b9c98a", bg: "#f2f4e2" },
  { id: 3, name: "Brown Sugar Pearl Milk Tea", price: 13.90, category: "Milk Tea",
    desc: "Brown sugar pearls, milk tea", color: "#8a5a33", bg: "#f3e7d8" },
  { id: 4, name: "White Peach Oolong Tea", price: 12.90, category: "Fruit Tea",
    desc: "White peach, roasted oolong", color: "#e8a0a8", bg: "#fbeeee" },
  { id: 5, name: "Mango Green Tea", price: 11.90, category: "Fruit Tea",
    desc: "Fresh mango, jasmine green tea", color: "#f0a832", bg: "#fdf3dd" },
  { id: 6, name: "Roasted Oolong Milk Tea", price: 12.90, category: "Milk Tea",
    desc: "Roasted oolong, fresh milk", color: "#a97c2f", bg: "#f5ead2" },
  { id: 7, name: "Lemon Honey Black Tea", price: 10.90, category: "Pure Tea",
    desc: "Lemon, honey, black tea", color: "#d9b23a", bg: "#fdf6da" }
];

var STATUS_STEPS = ["Ordered", "Preparing", "Collection", "Completed"];
var LEAVES_PER_ORDER = 15;
var STORAGE_KEY = "leafhaus_orders_v1";

var state = {
  store: STORES[0],
  category: "All",
  query: "",
  cart: [],
  voucher: null,
  payment: "Touch 'n Go",
  currentOrderId: null,
  custom: null
};

function $(id) { return document.getElementById(id); }
function money(n) { return "RM " + Number(n).toFixed(2); }
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function formatTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
}

/* ---------- Supabase ---------- */
var supabaseClient = null;

function isSupabaseConfigured() {
  var cfg = window.LEAFHAUS_CONFIG;
  if (!cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return false;
  if (cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") !== -1) return false;
  if (cfg.SUPABASE_ANON_KEY.indexOf("YOUR-ANON-KEY") !== -1) return false;
  return typeof window.supabase !== "undefined" &&
    typeof window.supabase.createClient === "function";
}

function initSupabase() {
  if (!isSupabaseConfigured()) return false;
  try {
    supabaseClient = window.supabase.createClient(
      window.LEAFHAUS_CONFIG.SUPABASE_URL,
      window.LEAFHAUS_CONFIG.SUPABASE_ANON_KEY
    );
    return true;
  } catch (e) {
    supabaseClient = null;
    return false;
  }
}

function setDbStatus(text, ok) {
  var el = $("dbStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "hint db-status" + (ok ? " ok" : "");
}

async function loadCatalogFromSupabase() {
  if (!supabaseClient) return;
  try {
    var storesRes = await supabaseClient.from("stores").select("name").order("id");
    if (!storesRes.error && storesRes.data && storesRes.data.length > 0) {
      STORES = storesRes.data.map(function (s) { return s.name; });
      if (STORES.indexOf(state.store) === -1) state.store = STORES[0];
    }
    var drinksRes = await supabaseClient.from("drinks").select("*").order("id");
    if (!drinksRes.error && drinksRes.data && drinksRes.data.length > 0) {
      DRINKS = drinksRes.data.map(function (d) {
        return {
          id: d.id,
          name: d.name,
          price: Number(d.price),
          category: d.category,
          desc: d.description || "",
          color: d.color || "#a97c2f",
          bg: d.bg || "#f5ead2"
        };
      });
    }
    var vouchersRes = await supabaseClient.from("vouchers").select("code, discount_rate");
    if (!vouchersRes.error && vouchersRes.data && vouchersRes.data.length > 0) {
      VOUCHERS = {};
      vouchersRes.data.forEach(function (v) {
        VOUCHERS[v.code] = Number(v.discount_rate);
      });
    }
  } catch (e) {
  }
  renderStores();
  renderCategories();
  renderMenu();
}

function cupSvg(drink) {
  return '<svg viewBox="0 0 64 96" aria-hidden="true">' +
    '<rect x="14" y="18" width="36" height="62" rx="6" fill="' + drink.color + '" opacity="0.92"/>' +
    '<rect x="14" y="18" width="36" height="10" rx="5" fill="#ffffff" opacity="0.35"/>' +
    '<rect x="10" y="10" width="44" height="10" rx="5" fill="#1f3a5f"/>' +
    '<rect x="28" y="2" width="8" height="12" rx="4" fill="#c9a86a"/>' +
    '<circle cx="26" cy="52" r="3" fill="#ffffff" opacity="0.5"/>' +
    '<circle cx="38" cy="64" r="2.4" fill="#ffffff" opacity="0.5"/>' +
    '<circle cx="32" cy="40" r="2" fill="#ffffff" opacity="0.5"/>' +
    '</svg>';
}

function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}
function findOrder(id) {
  var orders = loadOrders();
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === id) return orders[i];
  }
  return null;
}
function updateOrder(order) {
  var orders = loadOrders();
  for (var i = 0; i < orders.length; i++) {
    if (orders[i].id === order.id) { orders[i] = order; break; }
  }
  saveOrders(orders);
}

function mapDbOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    pickupNumber: row.pickup_number,
    store: row.store,
    items: (row.order_items || []).map(function (item) {
      return {
        name: item.name,
        size: item.size,
        ice: item.ice,
        sweet: item.sweet,
        qty: item.qty,
        unitPrice: Number(item.unit_price)
      };
    }),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    voucher: row.voucher_code,
    payment: row.payment,
    leaves: row.leaves,
    status: row.status,
    time: formatTime(row.created_at)
  };
}

async function dbFetchOrders() {
  if (supabaseClient) {
    var res = await supabaseClient
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (res.error) throw res.error;
    return (res.data || []).map(mapDbOrder);
  }
  return loadOrders();
}

async function dbFindOrder(id) {
  if (supabaseClient) {
    var res = await supabaseClient
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", id)
      .single();
    if (res.error || !res.data) return null;
    return mapDbOrder(res.data);
  }
  return findOrder(id);
}

async function dbUpdateOrder(order) {
  if (supabaseClient) {
    var res = await supabaseClient
      .from("orders")
      .update({ status: order.status })
      .eq("id", order.id);
    if (res.error) throw res.error;
    return;
  }
  updateOrder(order);
}

async function dbNextPickupNumber() {
  if (supabaseClient) {
    var res = await supabaseClient
      .from("orders")
      .select("id", { count: "exact", head: true });
    var n = 201 + (res.count || 0);
    return "T" + String(n).padStart(4, "0");
  }
  var orders = loadOrders();
  var n = 201 + orders.length;
  return "T" + String(n).padStart(4, "0");
}

async function dbSaveOrder(order) {
  if (supabaseClient) {
    var res = await supabaseClient.from("orders").insert({
      order_number: order.orderNumber,
      pickup_number: order.pickupNumber,
      store: order.store,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      voucher_code: order.voucher,
      payment: order.payment,
      leaves: order.leaves,
      status: order.status
    }).select("id").single();
    if (res.error || !res.data) throw (res.error || new Error("Could not save order"));
    var items = order.items.map(function (item) {
      return {
        order_id: res.data.id,
        name: item.name,
        size: item.size,
        ice: item.ice,
        sweet: item.sweet,
        qty: item.qty,
        unit_price: item.unitPrice
      };
    });
    var itemsRes = await supabaseClient.from("order_items").insert(items);
    if (itemsRes.error) throw itemsRes.error;
    order.id = res.data.id;
    return order;
  }
  var orders = loadOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

function renderStores() {
  $("storeSelect").innerHTML = STORES.map(function (s) {
    return '<option value="' + esc(s) + '"' + (s === state.store ? " selected" : "") +
      ">" + esc(s) + "</option>";
  }).join("");
}

function renderCategories() {
  $("categoryRow").innerHTML = CATEGORIES.map(function (c) {
    return '<button type="button" class="chip' + (c === state.category ? " selected" : "") +
      '" data-category="' + esc(c) + '">' + esc(c) + "</button>";
  }).join("");
}

function filteredDrinks() {
  var q = state.query.trim().toLowerCase();
  return DRINKS.filter(function (d) {
    var inCategory = state.category === "All" || d.category === state.category;
    var inQuery = !q || d.name.toLowerCase().indexOf(q) !== -1 ||
      d.desc.toLowerCase().indexOf(q) !== -1;
    return inCategory && inQuery;
  });
}

function renderMenu() {
  var list = filteredDrinks();
  $("emptyMenu").hidden = list.length > 0;
  $("menuGrid").innerHTML = list.map(function (d) {
    return '<button type="button" class="menu-card" data-drink="' + d.id + '">' +
      '<span class="drink-art" style="background:' + d.bg + '">' + cupSvg(d) + "</span>" +
      "<h3>" + esc(d.name) + "</h3>" +
      "<p>" + esc(d.desc) + "</p>" +
      '<span class="price">' + money(d.price) + "</span>" +
      "</button>";
  }).join("");
}

function openCustom(drinkId) {
  var drink = DRINKS.find(function (d) { return d.id === drinkId; });
  if (!drink) return;
  state.custom = {
    drinkId: drink.id,
    size: "Regular",
    ice: "Normal Ice",
    sweet: drink.id === 1 ? "Less Sweet" : "Normal Sweet",
    qty: 1
  };
  $("customDrinkArt").innerHTML = cupSvg(drink);
  $("customDrinkArt").style.background = drink.bg;
  $("customTitle").textContent = drink.name;
  $("customPrice").textContent = money(drink.price);
  syncCustomOptions();
  $("customQty").textContent = "1";
  showModal("customModal");
}

function syncCustomOptions() {
  var c = state.custom;
  setOptGroup("sizeRow", "size", c.size);
  setOptGroup("iceRow", "ice", c.ice);
  setOptGroup("sweetRow", "sweet", c.sweet);
}
function setOptGroup(rowId, attr, value) {
  var btns = $(rowId).querySelectorAll(".opt");
  btns.forEach(function (b) {
    b.classList.toggle("selected", b.getAttribute("data-" + attr) === value);
  });
}

function unitPrice(drink, size) {
  return drink.price + (size === "Large" ? 2 : 0);
}

function cartCount() {
  return state.cart.reduce(function (n, item) { return n + item.qty; }, 0);
}
function cartSubtotal() {
  return state.cart.reduce(function (sum, item) {
    var drink = DRINKS.find(function (d) { return d.id === item.drinkId; });
    return sum + unitPrice(drink, item.size) * item.qty;
  }, 0);
}
function discountAmount(subtotal) {
  return state.voucher ? subtotal * state.voucher.rate : 0;
}

function renderCartBar() {
  var count = cartCount();
  $("cartBar").hidden = count === 0;
  $("cartCount").textContent = count + (count === 1 ? " item" : " items");
  $("cartTotal").textContent = money(cartSubtotal());
}

function renderCart() {
  var box = $("cartItems");
  $("emptyCart").hidden = state.cart.length > 0;
  box.innerHTML = state.cart.map(function (item, i) {
    var drink = DRINKS.find(function (d) { return d.id === item.drinkId; });
    var line = unitPrice(drink, item.size) * item.qty;
    return '<div class="cart-item">' +
      '<span class="thumb" style="background:' + drink.bg + '">' + cupSvg(drink) + "</span>" +
      '<div class="info"><strong>' + esc(drink.name) + "</strong>" +
      "<span>" + esc(item.size) + ", " + esc(item.ice) + ", " + esc(item.sweet) + "</span>" +
      '<span class="qty"><button type="button" data-dec="' + i + '" aria-label="Decrease">−</button> ' +
      item.qty +
      ' <button type="button" data-inc="' + i + '" aria-label="Increase">+</button></span></div>' +
      '<span class="line-total">' + money(line) + "</span></div>";
  }).join("");

  var subtotal = cartSubtotal();
  var discount = discountAmount(subtotal);
  var total = subtotal - discount;
  $("cartSummary").innerHTML =
    '<div class="row"><span>Subtotal</span><span>' + money(subtotal) + "</span></div>" +
    '<div class="row discount"><span>Total discount' +
    (state.voucher ? " (" + esc(state.voucher.code) + ")" : "") +
    "</span><span>- " + money(discount) + "</span></div>" +
    '<div class="row total"><span>Total</span><span>' + money(total) + "</span></div>";
  $("placeOrderBtn").disabled = state.cart.length === 0;
}

async function placeOrder() {
  if (state.cart.length === 0) return;
  var subtotal = cartSubtotal();
  var discount = discountAmount(subtotal);
  var order = {
    id: "ORD-" + Date.now(),
    orderNumber: String(Date.now()).slice(-12),
    pickupNumber: await dbNextPickupNumber(),
    store: state.store,
    items: state.cart.map(function (item) {
      var drink = DRINKS.find(function (d) { return d.id === item.drinkId; });
      return {
        name: drink.name,
        size: item.size,
        ice: item.ice,
        sweet: item.sweet,
        qty: item.qty,
        unitPrice: unitPrice(drink, item.size)
      };
    }),
    subtotal: subtotal,
    discount: discount,
    total: subtotal - discount,
    voucher: state.voucher ? state.voucher.code : null,
    payment: state.payment,
    leaves: LEAVES_PER_ORDER,
    status: 0,
    time: formatTime(new Date())
  };
  try {
    order = await dbSaveOrder(order);
  } catch (e) {
    order.id = "ORD-" + Date.now();
    var orders = loadOrders();
    orders.unshift(order);
    saveOrders(orders);
    setDbStatus("Database save failed — this order was saved on this device only.", false);
  }

  state.cart = [];
  state.voucher = null;
  $("voucherInput").value = "";
  $("voucherMsg").textContent = "";
  renderCartBar();
  hideModal("cartModal");
  state.currentOrderId = order.id;
  renderOrderDetails(order);
  showModal("orderModal");
}

function renderOrderDetails(order) {
  var steps = STATUS_STEPS.map(function (step, i) {
    var done = i <= order.status;
    return '<div class="step' + (done ? " done" : "") + '">' +
      '<div class="dot">' + (done ? "✓" : (i + 1)) + "</div>" +
      "<span>" + step + "</span></div>";
  }).join("");

  var itemsHtml = order.items.map(function (item) {
    return '<div class="order-item-row"><div class="meta"><strong>' + esc(item.name) + "</strong>" +
      "<span>" + esc(item.size) + ", " + esc(item.ice) + ", " + esc(item.sweet) + "</span></div>" +
      "<span>" + money(item.unitPrice) + " × " + item.qty + "</span></div>";
  }).join("");

  $("orderDetails").innerHTML =
    '<div class="order-hero">' +
    "<h3>" + (order.status >= 3 ? "ORDER COMPLETED" : "ORDER " + STATUS_STEPS[order.status].toUpperCase()) + "</h3>" +
    '<div class="label">Pickup Number</div>' +
    '<div class="pickup-number">' + esc(order.pickupNumber) + "</div>" +
    '<div class="leaves">' + order.leaves + " Tea Leaves Earned!</div>" +
    "</div>" +
    '<div class="tracker">' + steps + "</div>" +
    '<div class="order-line"><span class="label">Store</span><span>' + esc(order.store) + "</span></div>" +
    itemsHtml +
    '<div class="summary">' +
    '<div class="row"><span>Total discount</span><span class="discount">- ' + money(order.discount) + "</span></div>" +
    (order.voucher ? '<div class="row"><span>Voucher applied</span><span>' + esc(order.voucher) + "</span></div>" : "") +
    '<div class="row total"><span>Subtotal</span><span>' + money(order.total) + "</span></div>" +
    '<div class="row"><span>' + esc(order.payment) + "</span><span>" + money(order.total) + "</span></div>" +
    "</div>" +
    '<div class="order-line"><span class="label">Order Time</span><span>' + esc(order.time) + "</span></div>" +
    '<div class="order-line"><span class="label">Order Number</span><span>' + esc(order.orderNumber) + "</span></div>";

  $("advanceBtn").disabled = order.status >= 3;
  $("advanceBtn").textContent = order.status >= 3
    ? "Order Completed"
    : "Simulate: advance order status";
}

async function renderOrders() {
  var orders;
  try {
    orders = await dbFetchOrders();
  } catch (e) {
    orders = loadOrders();
  }
  $("emptyOrders").hidden = orders.length > 0;
  $("ordersList").innerHTML = orders.map(function (o) {
    return '<button type="button" class="history-card" data-order="' + o.id + '">' +
      "<strong>" + esc(o.pickupNumber) + " — " + esc(STATUS_STEPS[o.status]) + "</strong>" +
      '<div class="sub">' + esc(o.store) + " · " + esc(o.time) + "</div>" +
      '<div class="sub">' + o.items.length + " item(s) · " + money(o.total) +
      " · " + esc(o.payment) + "</div></button>";
  }).join("");
}

function showModal(id) { $(id).hidden = false; }
function hideModal(id) { $(id).hidden = true; }

async function init() {
  renderStores();
  renderCategories();
  renderMenu();
  renderCartBar();

  if (initSupabase()) {
    setDbStatus("Connected to the Supabase database.", true);
    await loadCatalogFromSupabase();
  } else {
    setDbStatus("Local mode — orders are saved on this device only. Add your Supabase details in config.js to use the database.", false);
  }

  $("storeSelect").addEventListener("change", function (e) {
    state.store = e.target.value;
  });

  $("searchInput").addEventListener("input", function (e) {
    state.query = e.target.value;
    renderMenu();
  });

  $("categoryRow").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-category]");
    if (!btn) return;
    state.category = btn.getAttribute("data-category");
    renderCategories();
    renderMenu();
  });

  $("menuGrid").addEventListener("click", function (e) {
    var card = e.target.closest("[data-drink]");
    if (!card) return;
    openCustom(Number(card.getAttribute("data-drink")));
  });

  [["sizeRow", "size"], ["iceRow", "ice"], ["sweetRow", "sweet"]].forEach(function (pair) {
    $(pair[0]).addEventListener("click", function (e) {
      var btn = e.target.closest(".opt");
      if (!btn || !state.custom) return;
      state.custom[pair[1]] = btn.getAttribute("data-" + pair[1]);
      syncCustomOptions();
    });
  });

  $("qtyMinus").addEventListener("click", function () {
    if (state.custom && state.custom.qty > 1) {
      state.custom.qty -= 1;
      $("customQty").textContent = state.custom.qty;
    }
  });
  $("qtyPlus").addEventListener("click", function () {
    if (state.custom) {
      state.custom.qty += 1;
      $("customQty").textContent = state.custom.qty;
    }
  });

  $("addToCartBtn").addEventListener("click", function () {
    if (!state.custom) return;
    var existing = state.cart.find(function (item) {
      return item.drinkId === state.custom.drinkId &&
        item.size === state.custom.size &&
        item.ice === state.custom.ice &&
        item.sweet === state.custom.sweet;
    });
    if (existing) {
      existing.qty += state.custom.qty;
    } else {
      state.cart.push({
        drinkId: state.custom.drinkId,
        size: state.custom.size,
        ice: state.custom.ice,
        sweet: state.custom.sweet,
        qty: state.custom.qty
      });
    }
    renderCartBar();
    hideModal("customModal");
  });

  $("viewCartBtn").addEventListener("click", function () {
    renderCart();
    showModal("cartModal");
  });

  $("cartItems").addEventListener("click", function (e) {
    var inc = e.target.closest("[data-inc]");
    var dec = e.target.closest("[data-dec]");
    if (inc) {
      state.cart[Number(inc.getAttribute("data-inc"))].qty += 1;
    } else if (dec) {
      var i = Number(dec.getAttribute("data-dec"));
      state.cart[i].qty -= 1;
      if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
    } else {
      return;
    }
    renderCart();
    renderCartBar();
  });

  $("applyVoucherBtn").addEventListener("click", function () {
    var code = $("voucherInput").value.trim().toUpperCase();
    var msg = $("voucherMsg");
    if (VOUCHERS[code]) {
      state.voucher = { code: code, rate: VOUCHERS[code] };
      msg.textContent = "Voucher applied: " + Math.round(VOUCHERS[code] * 100) + "% off.";
      msg.className = "hint ok";
    } else {
      state.voucher = null;
      msg.textContent = "That voucher code is not valid. Try WELCOME50, TEA20 or LEAF10.";
      msg.className = "hint";
    }
    renderCart();
  });

  $("payRow").addEventListener("click", function (e) {
    var btn = e.target.closest(".opt");
    if (!btn) return;
    state.payment = btn.getAttribute("data-pay");
    $("payRow").querySelectorAll(".opt").forEach(function (b) {
      b.classList.toggle("selected", b === btn);
    });
  });

  $("placeOrderBtn").addEventListener("click", function () { placeOrder(); });

  $("advanceBtn").addEventListener("click", async function () {
    var order = await dbFindOrder(state.currentOrderId);
    if (!order || order.status >= 3) return;
    order.status += 1;
    try {
      await dbUpdateOrder(order);
    } catch (e) {
      return;
    }
    renderOrderDetails(order);
  });

  $("ordersBtn").addEventListener("click", function () {
    renderOrders();
    showModal("ordersModal");
  });

  $("ordersList").addEventListener("click", async function (e) {
    var card = e.target.closest("[data-order]");
    if (!card) return;
    var order = await dbFindOrder(card.getAttribute("data-order"));
    if (!order) return;
    state.currentOrderId = order.id;
    hideModal("ordersModal");
    renderOrderDetails(order);
    showModal("orderModal");
  });

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      hideModal(btn.getAttribute("data-close"));
    });
  });
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.hidden = true;
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
