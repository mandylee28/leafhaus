# Leafhaus

Leafhaus is a tea drink ordering web app. Browse the menu, customise a drink,
add it to your cart, apply a voucher, and place a pickup order. Track the
order from Ordered to Completed, and revisit past orders in My Orders.

## How to run

No build step and no installation needed. Just open `index.html` in a browser.

Orders are saved in the browser's localStorage on the device, so My Orders
persists between visits on the same browser.

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
- My Orders history, persisted in localStorage

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
