import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { RTCTLogo } from "../Logos/Logos";

export default function Footer() {
  const [hidden, setHidden] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setHidden(location.pathname !== "/");
  }, [location.pathname]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className={`w-full bg-black border-t border-zinc-900 font-mono ${hidden ? "hidden" : ""}`}>
      <div className="px-[6%] py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-8 gap-y-10">

          {/* Logo section */}
          <div className="col-span-full lg:col-span-2 text-white">
            <div className="flex items-center gap-2 mb-4">
              <RTCTLogo size={42} />
              <h1 className="text-white font-bold text-2xl tracking-widest">RTCT</h1>
            </div>
            <p className="text-base text-zinc-400 lg:max-w-xs leading-relaxed mb-6">
              Trusted by top developers all over the world. Have any query?
            </p>
            <button className="py-2.5 px-6 rounded-full border border-indigo-600 text-indigo-400 text-sm hover:bg-indigo-600 hover:text-white transition-colors tracking-wide">
              Contact us
            </button>
          </div>

          {/* RTCT links */}
          <div className="lg:mx-auto text-left">
            <h4 className="text-base text-white font-bold mb-6 tracking-widest uppercase">RTCT</h4>
            <ul className="text-base text-zinc-400 space-y-4">
              <li className="cursor-pointer hover:text-white transition-colors" onClick={() => scrollTo("scroll-to-home")}>Home</li>
              <li className="cursor-pointer hover:text-white transition-colors" onClick={() => scrollTo("scroll-to-features")}>Features</li>
              <li className="cursor-pointer hover:text-white transition-colors" onClick={() => scrollTo("scroll-to-feedback")}>Feedback</li>
            </ul>
          </div>

          {/* Products */}
          <div className="lg:mx-auto text-left">
            <h4 className="text-base text-white font-bold mb-6 tracking-widest uppercase">Products</h4>
            <ul className="text-base text-zinc-400 space-y-4">
              <li className="hover:text-white transition-colors cursor-pointer">Collaborative coding</li>
              <li className="hover:text-white transition-colors cursor-pointer">Task Management</li>
              <li className="hover:text-white transition-colors cursor-pointer">Progress Tracking</li>
            </ul>
          </div>

          {/* Resources */}
          <div className="lg:mx-auto text-left">
            <h4 className="text-base text-white font-bold mb-6 tracking-widest uppercase">Resources</h4>
            <ul className="text-base text-zinc-400 space-y-4">
              <li className="hover:text-white transition-colors cursor-pointer">FAQs</li>
              <li className="hover:text-white transition-colors cursor-pointer">Quick Start</li>
              <li className="hover:text-white transition-colors cursor-pointer">Documentation</li>
            </ul>
          </div>

          {/* Blogs */}
          <div className="lg:mx-auto text-left">
            <h4 className="text-base text-white font-bold mb-6 tracking-widest uppercase">Blogs</h4>
            <ul className="text-base text-zinc-400 space-y-4">
              <li className="hover:text-white transition-colors cursor-pointer">Tips &amp; Tricks</li>
              <li className="hover:text-white transition-colors cursor-pointer">Latest Updates</li>
              <li className="hover:text-white transition-colors cursor-pointer">Events</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-zinc-800 flex flex-col lg:flex-row items-center justify-between gap-4">
          <a
            href="https://www.linkedin.com/in/anmol-kushwaha-41aa47289/"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-zinc-500 hover:text-white underline transition-colors"
          >
            @RTCT 2026, All rights reserved.
          </a>

          <div className="flex space-x-6 items-center">
            {/* GitHub */}
            <a
              href="https://github.com/anmol1kush"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:scale-110 transition-all duration-300 ease-in-out block cursor-pointer relative z-40"
              aria-label="GitHub"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.799 8.205 11.387.6.111.82-.261.82-.58v-2.165c-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.332-1.756-1.332-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.774.42-1.305.763-1.606-2.665-.303-5.466-1.334-5.466-5.93 0-1.31.468-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.323 3.3 1.23a11.48 11.48 0 013.005-.404c1.02.004 2.045.137 3.005.404 2.292-1.553 3.3-1.23 3.3-1.23.653 1.653.242 2.873.118 3.176.77.84 1.236 1.911 1.236 3.221 0 4.609-2.803 5.625-5.475 5.921.43.37.814 1.102.814 2.221v3.293c0 .32.219.694.825.577C20.565 21.797 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/anmol-kushwaha-41aa47289/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:scale-110 transition-all duration-300 ease-in-out block cursor-pointer relative z-40"
              aria-label="LinkedIn"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11.5 19h-3v-11h3v11zm-1.5-12.28c-.97 0-1.75-.79-1.75-1.75s.78-1.75 1.75-1.75 1.75.79 1.75 1.75-.78 1.75-1.75 1.75zm13.5 12.28h-3v-5.5c0-1.38-.02-3.16-1.93-3.16-1.93 0-2.23 1.51-2.23 3.06v5.6h-3v-11h2.89v1.51h.04c.4-.75 1.37-1.54 2.82-1.54 3.01 0 3.57 1.98 3.57 4.56v6.47z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/_anmol.kush/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:scale-110 transition-all duration-300 ease-in-out block cursor-pointer relative z-40"
              aria-label="Instagram"
            >
              <svg
                className="w-8 h-8"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.057 1.97.246 2.42.415a4.602 4.602 0 011.675 1.096 4.602 4.602 0 011.096 1.675c.169.45.358 1.25.415 2.42.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.057 1.17-.246 1.97-.415 2.42a4.602 4.602 0 01-1.096 1.675 4.602 4.602 0 01-1.675 1.096c-.45.169-1.25.358-2.42.415-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.057-1.97-.246-2.42-.415a4.602 4.602 0 01-1.675-1.096 4.602 4.602 0 01-1.096-1.675c-.169-.45-.358-1.25-.415-2.42-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.057-1.17.246-1.97.415-2.42a4.602 4.602 0 011.096-1.675 4.602 4.602 0 011.675-1.096c.45-.169 1.25-.358 2.42-.415 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.012-4.947.071-1.28.059-2.164.27-2.92.573a6.734 6.734 0 00-2.448 1.636 6.734 6.734 0 00-1.636 2.448c-.303.756-.514 1.64-.573 2.92-.059 1.28-.071 1.688-.071 4.947s.012 3.667.071 4.947c.059 1.28.27 2.164.573 2.92a6.734 6.734 0 001.636 2.448 6.734 6.734 0 002.448 1.636c.756.303 1.64.514 2.92.573 1.28.059 1.688.071 4.947.071s3.667-.012 4.947-.071c1.28-.059 2.164-.27 2.92-.573a6.734 6.734 0 002.448-1.636 6.734 6.734 0 001.636-2.448c.303-.756.514-1.64.573-2.92.059-1.28.071-1.688.071-4.947s-.012-3.667-.071-4.947c-.059-1.28-.27-2.164-.573-2.92a6.734 6.734 0 00-1.636-2.448 6.734 6.734 0 00-2.448-1.636c-.756-.303-1.64-.514-2.92-.573-1.28-.059-1.688-.071-4.947-.071zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a3.999 3.999 0 110-8 3.999 3.999 0 010 8z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}