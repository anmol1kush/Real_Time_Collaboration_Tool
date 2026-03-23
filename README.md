# 🚀 RTCT — Real-Time Collaborative Task Manager

<div align="center">

![RTCT Banner](https://img.shields.io/badge/RTCT-Real--Time%20Collaboration-6366f1?style=for-the-badge&logo=socket.io&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?style=flat-square&logo=postgresql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io)
![Docker](https://img.shields.io/badge/Docker-Codespace-2496ED?style=flat-square&logo=docker)
![Redis](https://img.shields.io/badge/Redis-Presence-DC382D?style=flat-square&logo=redis)

**A full-stack, real-time collaborative workspace combining task management, live chat, document editing, and an in-browser VS Code-powered codespace — all in one platform.**

</div>

---

## ✨ Features

### 🔐 Authentication & User Management
- **Custom JWT authentication** — secure sign-up, login, and protected routes
- **Email invitations** — invite team members to projects via Nodemailer (SMTP)
- **Role-based access** — `ADMIN` and `MEMBER` roles per project
- **GitHub OAuth integration** — connect your GitHub account for repo access

### 📋 Project Management
- Create and manage multiple projects, each with its own workspace
- Invite collaborators by email with expiring invite links
- Accept / reject invites from the dedicated **My Invites** page
- View all project members and their roles

### 📌 Kanban Board (Real-Time)
- Drag-free kanban board with three columns: **TODO → IN PROGRESS → DONE**
- Create, update, and delete tasks with live sync across all connected users
- Real-time task state propagation via Socket.IO events (`kanban:created`, `kanban:updated`, `kanban:deleted`)

### 💬 Team Chat (Real-Time)
- Per-project live chat room using Socket.IO
- **Persistent chat history** stored in MongoDB — messages reload on join
- Sender name and timestamps displayed for each message
- Scrollable, auto-scrolling message feed

### 📝 Collaborative Document Editor
- Rich block-based editor powered by **Editor.js** with support for:
  - Headings, paragraphs, lists (ordered/unordered), checklists
  - Code blocks, inline code, quotes, delimiters
  - Tables, images, text markers and highlights
- **Live multi-user editing** — changes broadcast instantly to all project members
- **Auto-versioning** — a document version snapshot is saved every 10 edits
- Up to **50 versions** are retained per document (oldest purged automatically)


### 🖥️ In-Browser Codespace (Docker-Powered)
- Launch a **VS Code (code-server)** instance inside a Docker container directly from the browser
- Each project gets an isolated Docker container running a full development environment
- Connect the project to a **GitHub repository** — clone and open it automatically in the codespace
- Proxied through the backend with **WebSocket support** for full IDE functionality
- Start/stop codespace containers from the project dashboard

### 👥 Online Presence
- Real-time **online user indicator** for every project
- User online/offline status tracked in **Redis** and broadcast via Socket.IO `presence:update` events
- Displayed in the project navbar as a live count and user list

### 📣 Feedback System
- Integrated feedback form for collecting user suggestions
- Feedback submitted and stored via the backend API

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **React Router DOM 7** | Client-side routing |
| **TailwindCSS 4** | Utility-first CSS styling |
| **Framer Motion** | Animations & transitions |
| **Socket.IO Client 4** | Real-time WebSocket communication |
| **Editor.js** | Block-based document editor |
| **Radix UI** | Accessible UI primitives (Dialog, Select, Popover, etc.) |
| **NextUI** | Prebuilt UI components |
| **Lucide React / Tabler Icons** | Icon sets |
| **Axios** | HTTP client |
| **Sonner** | Toast notifications |
| **Embla Carousel** | Carousel / slider component |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server |
| **Socket.IO 4** | WebSocket real-time events |
| **Prisma ORM** | PostgreSQL schema, migrations & queries |
| **PostgreSQL** | Primary relational database (Users, Projects, Tasks, Documents) |
| **MongoDB + Mongoose** | Chat message persistence |
| **Redis** | Online user presence tracking |
| **Dockerode** | Programmatic Docker container management for codespace |
| **http-proxy-middleware** | Proxy HTTP/WebSocket requests to codespace containers |
| **JSON Web Token (JWT)** | Stateless authentication |
| **bcrypt** | Password hashing |
| **Nodemailer** | Email delivery for invitations |

---

## 🗄️ Database Schema (PostgreSQL via Prisma)

```
User         — id, email, name, image, password, githubToken
Project      — id, name, image, githubRepo, adminId
Membership   — userId, projectId, role (ADMIN | MEMBER)
Invite       — projectId, email, status (PENDING | ACCEPTED | REJECTED), expiresAt
Task         — id, title, status (TODO | IN_PROGRESS | DONE), projectId
Document     — id, content (JSON), projectId
DocumentVersion — id, content, savedBy, documentId
```

> **MongoDB** stores `Chat` documents with embedded message arrays per project.  
> **Redis** holds the live online-user map (`userId → socketId`).



## ⚙️ Environment Variables

### Backend (`Backend/.env`)
```env
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL (Prisma)
DATABASE_URL=postgresql://user:password@localhost:5432/rtct

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/RTCT

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/api/github/callback

# Email (Nodemailer / Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ADMIN_EMAIL=your_email@gmail.com
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 How to Run

### Prerequisites
- **Node.js** v18+
- **PostgreSQL** running locally (or a cloud connection string)
- **MongoDB** (local or Atlas)
- **Redis** (local or via Docker)
- **Docker Desktop** (required for the Codespace feature)

---

### 1. Clone the repository
```bash
git clone https://github.com/your-username/rtct.git
cd "Real time task Collaboration"
```

### 2. Setup the Backend
```bash
cd Backend

# Install dependencies
npm install

# Configure environment variables
# Copy the .env.example to .env and fill in your values
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the backend dev server
npm run dev
```
> Backend runs at **http://localhost:3000**

### 3. Setup the Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start the frontend dev server
npm run dev
```
> Frontend runs at **http://localhost:5173**

### 4. (Optional) Start Redis with Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

---



## 🔮 Future Improvements

### 📹 Video Meetings
- Integrate **WebRTC** (via SimpleWebRTC, Agora, or Jitsi) to enable in-project video/audio calls
- Add a dedicated "Meeting Room" per project with screen sharing support
- Meeting recording and replay stored as project artifacts

### 🤖 AI Assistant
- Integrate a context-aware AI copilot (OpenAI / Gemini API) inside the Document Editor and Codespace
- AI-powered task suggestions based on project description and kanban progress
- Smart chat commands (`/summarize`, `/assign`, `/estimate`)

### 📊 Project Analytics Dashboard
- Burndown charts and task completion velocity
- Member contribution stats and activity heatmaps
- Time-tracking per task with reports

### 🔔 Notification System
- In-app real-time notifications for: invites, task assignments, mentions in chat
- Email digest for daily/weekly activity summaries


### 🔒 Enhanced Security
- Refresh token rotation and revocation
- Two-factor authentication (2FA) via TOTP or email OTP
- Per-project audit logs (who changed what, when)

### ☁️ Cloud Deployment & CI/CD
- Dockerize the entire stack with `docker-compose`
- Add GitHub Actions pipeline for automated tests and deployment
- One-click deploy support for Vercel (frontend) + Railway/Render (backend)

### 🗂️ File Sharing
- Allow project members to upload and share files (images, PDFs, archives)
- Integrate with cloud storage (AWS S3 / Cloudinary)

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">
  Built with ❤️ by <strong>Anmol</strong>
</div>
