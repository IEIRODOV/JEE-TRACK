# EXAM TRACK: Mission Control 🚀

A high-performance JEE preparation hub designed for elite aspirants. Featuring real-time leaderboards, interactive 3D elements, and a curated resource hub.

![EXAM TRACK Preview](https://picsum.photos/seed/examtrack/1200/600)

## ✨ Features

- **Interactive 3D Arena:** Immersive study environment with Spline 3D integration.
- **Real-time Leaderboard:** Compete with students globally and track your rank.
- **Resource Hub:** Curated study materials and YouTube channels for JEE preparation.
- **Study Log:** Track your daily questions solved and study hours.
- **Aurora Background:** Beautiful, high-performance WebGL shader background.
- **Responsive Design:** Optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4
- **Animations:** Motion (Framer Motion)
- **3D/Graphics:** Three.js, Spline
- **Backend/Database:** Firebase (Auth, Firestore)
- **Icons:** Lucide React
- **Charts:** Recharts

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/exam-track.git
   cd exam-track
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase credentials (see `.env.example`):
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build for Production

To create an optimized production build:
```bash
npm run build
```
The output will be in the `dist/` folder.

## 🛡️ Security Rules

Make sure to deploy the Firestore security rules provided in `firestore.rules` to your Firebase project to ensure data integrity and security.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
