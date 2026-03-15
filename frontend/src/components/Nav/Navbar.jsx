import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RTCTLogo } from "../Logos/Logos";
import { useAuth } from "../../auth/authContext";

export default function NavbarComponent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full h-20 bg-black border-b border-zinc-900 flex items-center justify-between px-6 lg:px-10 font-mono sticky top-0 z-50">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2 text-white">
        <RTCTLogo size={45} />
        <span className="font-bold text-xl hidden sm:block tracking-widest">RTCT</span>
      </Link>

      {/* Center links */}
      <div className="hidden md:flex items-center gap-8 text-base">
        {user && (
          <>
            <Link to="/dashboard" className="text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link to="/invites" className="text-[#00ff9d] hover:text-[#00ff9d]/80 transition-colors font-semibold">
              Invites
            </Link>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="hidden md:flex items-center gap-5">
        {user ? (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center text-base font-semibold uppercase border border-zinc-700 shadow-sm">
              {user.name ? user.name[0] : user.email ? user.email[0] : "U"}
            </div>
            <button
              onClick={logout}
              className="px-5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20 hover:border-red-500/50 text-base font-medium"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-6 py-2.5 border border-[#00ff9d] text-[#00ff9d] text-sm hover:bg-[#00ff9d]/10 transition-colors rounded-full tracking-widest uppercase font-medium">
              Log In
            </Link>
            <button
              onClick={() => navigate("/signup")}
              className="px-6 py-2.5 border border-yellow-400 text-yellow-400 text-sm hover:bg-yellow-400/10 transition-colors rounded-full tracking-widest uppercase font-medium"
            >
              Get Started
            </button>
          </div>
        )}
      </div>

      {/* Mobile menu toggle */}
      <button
        className="md:hidden text-gray-300 hover:text-white"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-black border-b border-zinc-800 flex flex-col gap-4 p-6 md:hidden z-50">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-2 pb-4 border-b border-zinc-900">
                <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center text-base font-semibold uppercase border border-zinc-700">
                  {user.name ? user.name[0] : user.email ? user.email[0] : "U"}
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-medium">{user.name || "User"}</span>
                  <span className="text-zinc-500 text-xs">{user.email}</span>
                </div>
              </div>
              <Link to="/dashboard" className="text-base text-gray-300" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              <Link to="/invites" className="text-base text-[#00ff9d] font-semibold" onClick={() => setMenuOpen(false)}>Invites</Link>
              <button onClick={() => { logout(); setMenuOpen(false); }} className="text-base text-red-400 text-left mt-2">Sign Out</button>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <Link to="/login" className="text-sm tracking-widest uppercase text-[#00ff9d] border border-[#00ff9d] hover:bg-[#00ff9d]/10 text-center py-3 rounded-full font-medium transition-colors" onClick={() => setMenuOpen(false)}>Log In</Link>
              <button 
                onClick={() => { navigate("/signup"); setMenuOpen(false); }} 
                className="text-sm tracking-widest uppercase text-yellow-400 border border-yellow-400 hover:bg-yellow-400/10 py-3 rounded-full font-medium w-full transition-colors"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}