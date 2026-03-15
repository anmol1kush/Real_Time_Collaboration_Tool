import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RTCTLogo } from "../Logos/Logos";
import { useAuth } from "../../auth/authContext";

export default function Hero() {
  const { user } = useAuth();

  return (
    <div
      id="scroll-to-home"
      className="min-h-[calc(100vh-80px)] w-full bg-black relative overflow-hidden flex items-center justify-center"
    >
      {/* Black Basic Grid Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "#000000",
          backgroundImage: `
            linear-gradient(to right, rgba(75, 85, 99, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(75, 85, 99, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10  w-full px-25 pl-35  py-10">
        {/* Left: Text */}
        <div className="flex-1 lg:pl-0 text-left ">
          <h1 className="text-4xl lg:text-[62px] font-bold text-white leading-[1.5] font-mono tracking-wide">
            Collaborate<br />
            seamlessly, create<br />
            effortlessly
          </h1>
          <p className="text-2xl font-bold text-zinc-500 mt-8 max-w-lg font-mono leading-9">
            Transform collaboration with real-time editing of code, documents,
            and spreadsheets. Enjoy intuitive task management, chat
           and secure cloud deployment. Accomplish more, together.
          </p>

          <Link to={user ? "/dashboard" : "/login"} className="inline-block mt-12">
            <button className="px-10 py-4 rounded-full border border-zinc-700 text-white font-mono text-xl tracking-widest hover:bg-white/5 transition-colors">
              Get Started
            </button>
          </Link>
        </div>

        {/* Right: Logo */}
        <div className="hidden lg:flex flex-1 items-center justify-center text-white">
          <motion.div
            animate={{
              y: [-12, 12],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <RTCTLogo size="600" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}