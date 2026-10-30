import React, { useState, useEffect } from "react";
import {
  MindspaceUser,
  loginMindspaceUser,
  registerMindspaceUser,
  getRememberedCredentials,
} from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: MindspaceUser) => void;
  onBackToLanding: () => void;
}

export function AuthModal({ isOpen, onSuccess, onBackToLanding }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    const remembered = getRememberedCredentials();
    if (remembered && remembered.username) {
      setUsername(remembered.username);
      setPassword(remembered.password || "");
      setEmail(remembered.email || "");
      setRememberMe(true);
      setMode("login");
    } else {
      // Check if any users exist in localStorage; if none, start on Register tab for convenience
      const rawUsers =
        typeof window !== "undefined"
          ? localStorage.getItem("mindspace_registered_users_v1")
          : null;
      if (!rawUsers || rawUsers === "[]") {
        setMode("register");
      } else {
        setMode("login");
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "register") {
      const res = registerMindspaceUser({
        username,
        email,
        password,
        rememberMe,
      });
      if (!res.ok || !res.user) {
        setErrorMsg(res.error || "Registration failed.");
        return;
      }
      setSuccessMsg(`Account "@${res.user.username}" registered! Entering Mindspace...`);
      onSuccess(res.user);
    } else {
      const res = loginMindspaceUser({
        username,
        password,
        rememberMe,
      });
      if (!res.ok || !res.user) {
        setErrorMsg(res.error || "Login failed.");
        return;
      }
      onSuccess(res.user);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#020604]/95 backdrop-blur-xl p-4 overflow-y-auto">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[360px] rounded-full bg-[#00e59a]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[280px] rounded-full bg-[#38bdf8]/8 blur-[110px]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-[#1d6445] bg-gradient-to-b from-[#071610] via-[#040d09] to-[#020705] p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(0,229,154,0.14)] text-[#f0f7f3]">
        {/* Top bar: Back to Landing */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a4d36] bg-[#06130d] px-3 py-1.5 text-xs font-bold text-[#9ab8a8] hover:border-[#00e59a] hover:text-white transition-all"
          >
            <span>←</span>
            <span>Back to Landing Page</span>
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00e59a]/40 bg-[#00e59a]/10 px-2.5 py-1 text-[10px] font-mono font-bold text-[#00e59a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e59a] animate-ping" />
            PRIVATE WORKSPACE
          </span>
        </div>

        {/* Brand Identity */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="h-12 w-12 rounded-2xl border border-[#1f6e4c] bg-[#061810] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,154,0.2)]">
            <img src="/logo.png" alt="Mindspace" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white">MINDSPACE ACCESS</h1>
            <p className="text-xs text-[#92a79c]">
              Personal 3D AI Trading Floor & Isolated Portfolio
            </p>
          </div>
        </div>

        {/* Login / Register Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#020705] border border-[#154531] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              mode === "login"
                ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_15px_rgba(0,229,154,0.35)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🔐 Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
            className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              mode === "register"
                ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_15px_rgba(0,229,154,0.35)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            ✨ Register Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-[#ff3549]/60 bg-[#ff3549]/15 px-3.5 py-2.5 text-xs font-semibold text-[#ff808d]">
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-[#00e59a]/60 bg-[#00e59a]/15 px-3.5 py-2.5 text-xs font-semibold text-[#00e59a]">
            ✓ {successMsg}
          </div>
        )}

        {/* Auth Form (Strictly Username + Password for Login; Username + Email + Password for Register; Remember Me; NO Forgot Password) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9db8aa] mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="Enter your username (e.g. ashwin)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[#1b573d] bg-[#030906] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a] shadow-inner"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9db8aa] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email (e.g. you@example.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#1b573d] bg-[#030906] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a] shadow-inner"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9db8aa] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#1b573d] bg-[#030906] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a] shadow-inner"
            />
          </div>

          {/* Remember Me Option Only (Strictly NO Forgot Password link/button) */}
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#1b573d] bg-[#030906] accent-[#00e59a] cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-200">
                Remember me on this device
              </span>
            </label>
            <span className="text-[10.5px] font-mono text-[#00e59a]">Username + Password Auth</span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl border border-[#00e59a] bg-[#00e59a] text-[#00180e] font-black text-sm uppercase tracking-wider hover:bg-[#48ffbe] hover:shadow-[0_0_25px_rgba(0,229,154,0.4)] transition-all mt-2"
          >
            {mode === "login" ? "Enter Mindspace Workspace →" : "Register & Open Mindspace →"}
          </button>
        </form>

        {/* Per-User Isolation Info Footer */}
        <div className="mt-6 pt-4 border-t border-[#143c2b] flex items-center justify-between text-[11px] text-[#8da89a]">
          <div className="flex items-center gap-1.5">
            <span>🐂</span>
            <span>🐻</span>
            <span>🦌</span>
            <span>🐇</span>
            <span className="ml-1 font-medium">4 Autonomous AI Agents</span>
          </div>
          <span className="font-mono text-[10px] text-[#00e59a]">100% Isolated User Data</span>
        </div>
      </div>
    </div>
  );
}
