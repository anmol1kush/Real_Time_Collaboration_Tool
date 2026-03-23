import React, { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../auth/authContext";

export default function FeedBackSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [experience, setExperience] = useState(5);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`http://localhost:3000/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          message: data.message,
          experience,
        }),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit feedback");
      }
      
      toast.success("Feedback submitted successfully!");
      e.target.reset();
      setExperience(5); // Reset slider
    } catch (err) {
      console.error("Feedback error:", err);
      toast.error(err.message || "Error submitting feedback");
    } finally {
      setLoading(false);
    }
  }

  /* Autofill background override — browsers inject white on autofill,
     we counter it by painting a dark inset box-shadow over the field */
  const autofillFix = {
    WebkitBoxShadow: "0 0 0 1000px #09090b inset",
    WebkitTextFillColor: "#ffffff",
  };

  return (
    <div
      id="scroll-to-feedback"
      className="w-full max-w-[90%] mx-auto p-10 rounded-[32px] bg-zinc-950 my-[8vh] flex flex-col md:flex-row gap-10 items-start font-mono"
    >
      {/* Left: Description */}
      <div className="flex-1 text-white">
        <h2 className="text-6xl font-bold leading-snug mb-4">
          Help us improve our website!
        </h2>
        <p className="text-xl text-gray-400 leading-relaxed mb-8">
          We're always looking for ways to make our website better. Tell us what
          you think and how we can improve your experience.
        </p>

        
      </div>

      {/* Right: Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5 w-full"
      >
        <input
          name="name"
          placeholder="Enter your name"
          required
          style={autofillFix}
          className="w-full bg-transparent border-b border-zinc-700 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
        />
        <input
          name="email"
          type="email"
          placeholder="Enter your email"
          required
          style={autofillFix}
          className="w-full bg-transparent border-b border-zinc-700 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
        />
        <textarea
          name="message"
          placeholder="Enter your feedback"
          required
          rows={6}
          className="w-full bg-[#0d1117] border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 resize-none"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded-full border border-[#00ff9d] text-[#00ff9d] text-sm hover:bg-[#00ff9d]/10 transition-colors font-mono disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
