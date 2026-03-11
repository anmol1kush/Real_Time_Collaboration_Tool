import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/authContext";
import Home from "./pages/Home";
import Dashboard from "./pages/DashBoard";
import Project from "./pages/Project";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RequireAuth from "./auth/RequireAuth";
import MyInvites from "./pages/MyInvites";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/project/:projectId"
            element={
              <RequireAuth>
                <Project />
              </RequireAuth>
            }
          />

          <Route
            path="/invites"
            element={
              <RequireAuth>
                <MyInvites />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}