"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRoute = searchParams.get("next") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Username atau password salah");
      }

      router.push(nextRoute);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-surface border border-outline-variant rounded-xl p-lg shadow-sm animate-fade-in">
      
      {/* Header */}
      <div className="text-center mb-lg">
        <h2 className="font-h1 text-h1 text-primary font-bold mb-xs">
          Jurnal Mengajar
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Masuk untuk mencatat jurnal harian Anda
        </p>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mb-md p-3 rounded-lg bg-error-container text-on-error-container font-body-md text-sm flex items-center gap-2.5 animate-fade-in border border-error/10">
          <span className="material-symbols-outlined text-error text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-md">
        {/* Username */}
        <div className="flex flex-col gap-xs">
          <label className="font-label-caps text-label-caps text-on-surface-variant">
            Username <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              person
            </span>
            <input
              type="text"
              required
              placeholder="Masukkan username Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full bg-surface border border-outline rounded p-3 pl-10 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-xs">
          <label className="font-label-caps text-label-caps text-on-surface-variant">
            Password <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              lock
            </span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full bg-surface border border-outline rounded p-3 pl-10 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-body-md placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center gap-sm py-xs">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-outline text-primary focus:ring-primary/20 accent-primary cursor-pointer disabled:opacity-50"
          />
          <label htmlFor="rememberMe" className="font-body-md text-body-md text-on-surface-variant select-none cursor-pointer disabled:opacity-50">
            Ingat Saya (1 minggu)
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-3 px-4 rounded-lg shadow-sm hover:bg-primary/95 transition-all flex items-center justify-center gap-xs active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Masuk</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="text-center mt-lg pt-md border-t border-outline-variant/60">
        <p className="font-caption text-caption text-on-surface-variant">
          Jurnal Mengajar &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-container-margin font-body-lg">
      <Suspense fallback={
        <div className="w-full max-w-[440px] bg-surface border border-outline-variant rounded-xl p-lg shadow-sm flex flex-col items-center justify-center min-h-[300px]">
          <span className="material-symbols-outlined animate-spin text-[40px] text-primary">sync</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-md">Memuat halaman masuk...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
