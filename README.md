# Real-Time Task Collaboration Tool (RTCT)

RTCT is a comprehensive, real-time collaborative workspace designed for modern teams and developers. It provides a highly responsive, premium "hacker terminal" aesthetic environment where teams can manage tasks, edit documents simultaneously, chat, and even write code in isolated in-browser Codespaces.

---

## ✨ Features

- **🔐 Secure Authentication**
  - JWT-based login, signup, and robust session management utilizing `bcrypt` for password hashing.
  
- **📁 Project Workspaces & Members**
  - Create and manage isolated project environments.
  - Role-based membership (Admin, Member).
  - Built-in **Email Invitation System** via Nodemailer to securely invite teammates.

- **🟢 Real-Time Team Presence**
  - Powered by **Redis** and **WebSockets**, instantly see which teammates are currently online and active in the workspace without page refreshes.

- **📋 Live Kanban Board**
  - Drag-and-drop task management (Todo, In Progress, Done).
  - All task movements are instantly broadcasted to all connected clients.

- **📄 Collaborative Document Editing**
  - Rich-text, block-style editor powered by **Editor.js**.
  - Multiple users can view and edit the document simultaneously.
  - **Auto-versioning**: Snapshots of the document are automatically backed up to PostgreSQL every 10 edits, allowing you to view and restore previous versions.

- **💬 Real-Time Team Chat**
  - Project-specific instant messaging.
  - Chat history is persistently stored in MongoDB.

- **⌨️ Integrated Codespaces & GitHub**
  - Securely connect your GitHub account via OAuth.
  - Spin up isolated, Docker-backed server environments (`code-server`) directly in the browser.
  - Push code directly to your GitHub repositories without exposing personal access tokens.

- **🎨 Premium UI/UX Aesthetic**
  - Designed with a modern, dark "hacker terminal" aesthetic.
  - Features smooth micro-animations powered by **Framer Motion**.
  - Fully responsive layout utilizing **Tailwind CSS**.

---

## 💻 Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4, NextUI
- **Animations**: Framer Motion
- **Routing**: React Router v7
- **Rich Text Editor**: Editor.js (with plugins for code, lists, headers, etc.)
- **Real-Time Communications**: `socket.io-client`
- **Icons**: Lucide React & Tabler Icons

### Backend
- **Framework**: Node.js with Express.js
- **Primary Database**: **PostgreSQL** (Managed via **Prisma ORM** v6)
- **Secondary Database**: **MongoDB** (Managed via **Mongoose**, optimized for flexible chat histories)
- **Caching & Memory Store**: **Redis** (Used for high-speed user presence tracking and session data)
- **Real-Time Engine**: `socket.io`
- **Containerization**: `dockerode` (Programmatically spins up Docker containers for Codespaces)
- **Proxy**: `http-proxy-middleware` (Routes traffic safely to active Codespace containers)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database
- MongoDB Database
- Redis Server
- Docker (Required for Codespace generation)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Real-Time-Task-Collaboration
   ```

2. **Setup Backend:**
   ```bash
   cd Backend
   npm install
   
   # Setup environment variables
   # Create a .env file containing DATABASE_URL, MONGO_URI, REDIS_URL, JWT_SECRET, etc.
   
   # Run Prisma Migrations
   npm run prisma:generate
   npm run prisma:migrate
   
   # Start the development server
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   
   # Start the frontend Vite server
   npm run dev
   ```

### Architecture Overview
- **Data Layer separation**: Relational data (Users, Projects, Tasks, Document state) is stored in PostgreSQL for strict schema enforcement, while chat messages use MongoDB for fast, documentless append operations. Redis bridges the gap for in-memory, ephemeral state like "who is online right now".
- **Socket Handling**: A single WebSocket connection multiplexes Chat, Kanban, Document, and Presence events intelligently using socket namespaces/rooms assigned to `projectIds`.
