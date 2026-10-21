# 🛵 Rapido Clone – Real-Time Ride-Hailing Platform

A full-stack, real-time ride-hailing web platform inspired by **Rapido**, built with **Next.js 14**, **Tailwind CSS**, **Node.js/Express**, **Socket.IO**, **Prisma ORM**, and **Stripe**.

Featuring Rapido's signature **Yellow & Slate** aesthetic, **Bike Taxi**, **Auto**, and **Cabs (Economy & Comfort)**, a dedicated **Captain Dashboard**, **4-Digit Ride Start OTP**, **Live GPS Route Simulation**, **Stripe Checkout**, and **Downloadable PDF Tax Invoices**.

---

## ⚡ Quick Start (1-Minute Setup)

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24)
- **npm**: v9+

### 2. Start Both Frontend and Backend Concurrently
From the root directory:
```bash
npm run dev
```

This launches:
- 🌐 **Rider Frontend**: [http://localhost:3000](http://localhost:3000)
- 🛵 **Captain Dashboard**: [http://localhost:3000/captain](http://localhost:3000/captain)
- 🚀 **Express & Socket.IO Server**: [http://localhost:5000](http://localhost:5000)

---

## 📱 Feature Walkthrough & Architecture

### 1. 🛵 Rapido Vehicle Categories & Fare Engine
- **Rapido Bike Taxi**: Fast & ultra-economical (Base ₹25, helmet safety guarantee).
- **Rapido Auto**: Meter-fare guaranteed doorstep pickup (Base ₹35).
- **Rapido Cab Economy**: AC hatchback/compact sedan (Base ₹60).
- **Rapido Cab Comfort**: Premium AC sedan with top-rated Captains (Base ₹90).
- **Promo Coupons**: Pre-seeded with `RAPIDO50`, `WELCOME20`, and `BIKERUSH` with instant fare recalculation.

### 2. 🔐 4-Digit Ride Start OTP
- When a rider books a trip, a unique 4-digit PIN (e.g. `5821`) is displayed boldly on the rider's screen.
- When the Captain arrives at the pickup point, the Captain must enter this 4-digit PIN.
- If verified, the trip status advances to `IN_PROGRESS`.

### 3. 📍 Real-Time Socket.IO & GPS Route Tracking
- Bidirectional communication connects Riders and Captains.
- **15-Second Captain Radar Alert**: Captain receives an incoming ride request popup with a live 15-second countdown progress bar.
- **GPS Simulation**: Captain can click *"Simulate Live Route Movement"* to broadcast real-time waypoints along the route, animating the vehicle icon live on both screens.

### 4. 💳 Payments, Receipts & Reviews
- **Stripe Integration**: Supports live Stripe keys or seamless simulation mode.
- **Captain Tip**: Riders can add a custom tip (₹10, ₹20, ₹50).
- **Instant PDF Tax Receipt**: Download an official tax invoice generated with `jsPDF`.
- **5-Star Captain Reviews**: Dynamic star rating and feedback submitted directly to the Captain's profile.

### 5. 🚨 Safety & Emergency SOS
- Dedicated **SOS Alert** button transmitting live GPS coordinates to safety dispatch and quick-dial emergency contacts (112 Police, 108 Medical).

---

## 📂 Project Structure

```
e:\cab booking\
├── package.json               # Root workspace script runner (concurrently)
├── README.md                  # Project documentation
│
├── client/                    # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx       # Rider Booking & Interactive Map
│   │   │   ├── captain/       # Captain Console & 15s Radar
│   │   │   ├── history/       # Ride History & PDF Invoices
│   │   │   └── layout.tsx     # Global layout & Rapido branding
│   │   ├── components/        # Map, VehicleSelector, ActiveRideCard, PaymentModal, SOSModal
│   │   ├── lib/               # Socket.IO client, REST API client
│   │   └── types/             # Shared TypeScript interfaces
│   └── package.json
│
└── server/                    # Node.js & Express Real-Time Backend
    ├── src/
    │   ├── index.ts           # Express & Socket.io server
    │   ├── routes/            # Rides, Fares, Captains, Payments, Promos, Reviews
    │   ├── sockets/           # Real-time ride matching & location streaming
    │   ├── services/          # Fare calculation & Stripe service
    │   └── prisma/            # SQLite schema & database seeder
    └── package.json
```

---

## 🛠️ Optional Live Credentials Setup

To connect live production services, simply populate the `.env` files:

### `server/.env`
```env
PORT=5000
DATABASE_URL="file:./dev.db" # Or your PostgreSQL / Supabase connection string
CLIENT_URL="http://localhost:3000"

STRIPE_SECRET_KEY=sk_test_...
CLERK_SECRET_KEY=...
```

### `client/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```
