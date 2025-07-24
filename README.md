# Hash8 Intranet

A modern, organization-oriented intranet platform for real-time group chat, direct messaging, and a social feed—built with React, TypeScript, Vite, shadcn-ui, and Tailwind CSS.

---

## ✨ Features

- **Authentication**: Google login and email/password registration (with Firebase Auth)
- **Responsive UI**: Mobile-first, beautiful on all devices
- **Sidebar Navigation**: Switch between groups, direct chats, and a company-wide feed
- **Group Chat**: Real-time group messaging with typing indicators, avatars, and unread badges
- **Direct Chat**: One-on-one messaging with instant feedback
- **Organization Feed**: Instagram-style post feed with images, reactions, comments, and save/bookmark
- **Add Post**: Share updates, images, and more (demo posts included)
- **Dark Mode**: Toggle between light and dark themes
- **Customizable**: Built with shadcn-ui and Tailwind for easy theming
- **404 Page**: Friendly not-found page for invalid routes

---

## 🚀 Quick Start

1. **Clone the repository:**
   ```sh
   git clone https://github.com/kamaleshsk123/hash8-chatter.git
   cd hash8-chatter
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up Firebase:**
   - Create a Firebase project and enable Google and Email/Password authentication.
   - Add your Firebase config to a `.env` file (see `.env.example`).
4. **Start the development server:**
   ```sh
   npm run dev
   ```
5. **Open in your browser:**
   - Visit [http://localhost:5173](http://localhost:5173) (or the port shown in your terminal)

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **UI:** shadcn-ui, Tailwind CSS, Framer Motion, Lucide Icons
- **State:** React Context, React Query
- **Backend:** Firebase Auth, Firestore (for real data, currently demo data)
- **Other:** date-fns, Radix UI, class-variance-authority

---

## 🗂️ Project Structure

- `src/pages/Chat.tsx` — Main chat and feed logic
- `src/pages/FeedDemo.tsx` — Organization feed (posts, reactions, comments)
- `src/pages/Login.tsx` — Login and registration (Google & email)
- `src/pages/ChatSidebar.tsx` — Sidebar navigation (groups, chats, feed)
- `src/context/AuthContext.tsx` — Authentication context
- `src/services/firebase.ts` — Firebase setup and auth helpers
- `src/components/ChatBubble.tsx` — Chat message UI
- `src/pages/AddPostInput.tsx` — Add post input for the feed

---

## 💬 Chat & Messaging

- **Group chat:**
  - Real-time messages, avatars, typing indicators, unread badges
  - Responsive chat bubbles (sent/right, received/left)
- **Direct chat:**
  - One-on-one messaging, mock replies for demo
- **Sidebar:**
  - Switch between groups, chats, and feed
  - Selected item is highlighted

## 📰 Organization Feed

- **Feed:**
  - Instagram-style posts with images, text, reactions (emoji), comments, and save/bookmark
  - Add new posts (with image upload)
  - On mobile: floating + button opens overlay input
  - On web: input always at top, + button scrolls to top when input is out of view

## 🔐 Authentication

- **Google login** (OAuth)
- **Email/password registration and login**
- **Firebase Auth** for secure user management

## 🌈 Theming & UI

- **Dark mode** toggle
- **shadcn-ui** and **Tailwind CSS** for modern, customizable design
- **Radix UI** for accessible components

## 🏗️ Deployment

- Deploy to Vercel, Netlify, or GitHub Pages
- Add your Firebase config in production
- Connect a custom domain via your hosting provider

---

## 🤝 Contributing

Pull requests and issues are welcome! Please open an issue to discuss your idea or bug before submitting a PR.

---

## 📄 License

MIT
