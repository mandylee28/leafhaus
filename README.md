# Leafhaus

Leafhaus is a tea drink ordering web app. Browse the menu, customise a drink,
add it to your cart, apply a voucher, and place a pickup order. Track the
order from Ordered to Completed, and revisit past orders in My Orders.

## How to run

No build step and no installation needed. Just open `index.html` in a browser.

Without any setup the app runs in local mode: orders are saved in the
browser's localStorage on the device, so My Orders persists between visits
on the same browser. To store orders in a shared database instead, follow
the Database (Supabase) setup below.

## Features

- 7 tea drinks with search and category filters (All, Milk Tea, Pure Tea,
  Fruit Tea, Matcha)
- Store picker: Leafhaus MY Horizon Mall, Leafhaus MY Eco Botanic,
  Leafhaus MY Aeon Bukit Indah
- Drink customisation: size (Regular / Large +RM 2.00), ice level, sweetness
- Cart with quantity editing
- Checkout with vouchers and payment methods (Touch 'n Go, card, cash)
- Order placement generates a pickup number (e.g. T0201) and earns
  15 Tea Leaves per order
- Order Details view with the Ordered → Preparing → Collection → Completed
  tracker, including a button to simulate advancing the order status
- Discount / subtotal / payment summary, order time and order number
- My Orders history — from the Supabase database when configured (newest
  first, latest 20), otherwise from localStorage on the device

## Database (Supabase)

Orders, menu, stores and vouchers can live in a hosted PostgreSQL database
on Supabase, so orders are shared across devices instead of being stuck in
one browser's localStorage.

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, open the **SQL Editor**, paste the contents of
   `supabase-schema.sql`, and run it. This creates the `stores`, `drinks`,
   `vouchers`, `orders` and `order_items` tables, enables Row Level Security
   with policies for the anon key, and seeds the 3 stores, 7 drinks and
   3 vouchers.
3. Copy `config.example.js` to `config.js` and fill in your Project URL and
   anon key from **Settings > API** in the Supabase Dashboard.
4. Open `index.html`. The line under the welcome offer will say
   "Connected to the Supabase database."

`config.js` is gitignored and is never committed — only the placeholders in
`config.example.js` go into the repo. Without a real `config.js` the app
falls back to local mode: the built-in menu is used and orders are saved in
localStorage on the device only.

## Vouchers

| Code | Discount |
|------|----------|
| `WELCOME50` | 50% off |
| `TEA20` | 20% off |
| `LEAF10` | 10% off |

## Files

- `index.html` — page structure
- `styles.css` — cream / gold / navy styling, mobile-first
- `app.js` — menu, cart, checkout, orders and tracking logic
- `supabase-schema.sql` — database tables, policies and seed data for Supabase
- `config.example.js` — Supabase URL / anon key placeholders (copy to `config.js`)
- `config.js` — your real Supabase details (gitignored, never committed)
