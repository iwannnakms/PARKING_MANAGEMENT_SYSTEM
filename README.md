# ParkSync - Premium Real-Time Parking Management System

ParkSync is a high-tech, Awwwards-level full-stack parking management ecosystem built with **Vanilla JS**, **Node.js**, **Socket.io**, and **MongoDB**. It features bi-directional real-time synchronization, advanced glassmorphism UI, and role-based dashboards for Admins, Guards, and Customers.

## 🚀 Key Features

### 🌟 Premium UX/UI
- **Deep Space Aesthetic:** Custom dark-mode interface with floating animated CSS orbs.
- **Glassmorphism:** Heavy use of `backdrop-filter`, semi-transparent panels, and neon glowing accents.
- **Micro-interactions:** Smooth `cubic-bezier` animations for sidebar collapses, form reveals, and status updates.

### 👤 Customer Dashboard
- **Interactive Facility Map:** Real-time visual grid of 50 parking spots with instant selection.
- **Secure Reservations:** Configure vehicle type, registration number, and time slots.
- **Digital Pass:** Instantly generated QR codes for entry validation.
- **Booking History:** Complete log of all past reservations and cancellations.

### 🛡️ Security Guard Terminal
- **Dual-Mode Scanner:** Seamlessly switch between **Entry Mode** and **Exit Mode**.
- **Real-Time Validation:** Scan QR codes or enter hex tokens to check vehicles in/out instantly.
- **Manual Overrides:** Bird's-eye "Spot Monitor" to force check-in/out for manual resolution.
- **Live Terminal Log:** Real-time event log tracking all facility activity.

### 📊 Admin Command Center
- **Live Analytics:** Real-time revenue tracking, occupancy rates, and traffic counters.
- **Data Visualization:** Interactive doughnut charts showing spot distribution.
- **Global Monitor:** Bird's-eye view of the entire facility with live status propagation.

## 🛠️ Tech Stack
- **Frontend:** Vanilla HTML5, CSS3 (Modern Grid/Flexbox), Vanilla JavaScript.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (Mongoose).
- **Real-Time:** Socket.io (Bi-directional events).
- **Auth:** JWT (JSON Web Tokens) & Bcrypt hashing.
- **Libraries:** Chart.js, qrcode.js, html5-qrcode.

## 🏁 Getting Started

### 1. Prerequisites
- Node.js (v16+)
- MongoDB (Running locally or a cloud URI)

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install
```

### 3. Setup Environment
Create a `.env` file in the root directory:
```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/parking_db
JWT_SECRET=your_super_secret_key
```

### 4. Seed the Database
Initialize the facility with 50 spots and default users:
```bash
node seed.js
```

### 5. Run the Application
You will need two terminal windows:

**Terminal 1 (Backend API):**
```bash
node backend/server.js
```

**Terminal 2 (Frontend UI):**
```bash
npx serve -l 3000 frontend/public
```

## 🔐 Default Credentials
- **Admin:** `admin@system.com` / `admin123`
- **Guard:** `guard@system.com` / `guard123`
- **Customer:** Create your own via the Sign-Up portal!

## 🧪 Testing the Ecosystem
Use the **"Dev Mode"** dropdown in the sidebar to quickly switch between roles and see how actions (like booking a spot) propagate across the Admin and Guard terminals in real-time.

---
Built with ⚡ by Gemini CLI.
