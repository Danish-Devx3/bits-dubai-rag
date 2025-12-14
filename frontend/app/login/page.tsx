"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield, ArrowRight, Circle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { authApi } from "@/lib/api";

type UserType = "admin" | "student" | null;

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme, mounted } = useTheme();
  const [userType, setUserType] = useState<UserType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const profile = await authApi.getProfile();
          if (profile) {
            const storedUserType = localStorage.getItem("userType");
            if (storedUserType) {
              router.push(storedUserType === "admin" ? "/admin" : "/student");
            }
          }
        }
      } catch (error) {
        localStorage.removeItem("user");
        localStorage.removeItem("userType");
        localStorage.removeItem("userEmail");
      }
    };
    checkAuth();
  }, [router]);

  const handleUserTypeSelect = (type: "admin" | "student") => {
    setUserType(type);
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(email, password);

      if (response.user) {
        const userRole = response.user.role || (userType || "student");
        const determinedUserType = userRole === "admin" ? "admin" : "student";

        localStorage.setItem("userType", determinedUserType);
        localStorage.setItem("userEmail", email);

        router.push(determinedUserType === "admin" ? "/admin" : "/student");
      } else {
        setError("Invalid response from server. Please try again.");
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Invalid credentials. Please check your email and password.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 selection:bg-primary/10 selection:text-primary">
      {/* Theme Toggle - Fixed Position */}
      {mounted && (
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      )}

      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/5 rounded-xl border border-primary/10">
              <Circle className="w-6 h-6 text-primary fill-primary/20" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              BITS-GPT
            </h1>
          </div>
          <p className="text-muted-foreground font-medium">
            Secure Access Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl shadow-xl shadow-gray-200/50 border border-border/50 p-8 md:p-10 backdrop-blur-xl">
          {!userType ? (

            // Role Selection
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground text-center mb-8">
                Identify Access Level
              </h2>

              <div className="space-y-4">
                <button
                  onClick={() => handleUserTypeSelect("admin")}
                  className="w-full p-5 border border-border rounded-2xl hover:border-primary/50 hover:bg-secondary/30 transition-all duration-300 text-left group flex items-center gap-4 bg-background/50"
                >
                  <div className="p-3 bg-secondary rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Shield className="w-6 h-6 text-foreground/70 group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">Administrator</h3>
                    <p className="text-xs text-muted-foreground">System management & uploads</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => handleUserTypeSelect("student")}
                  className="w-full p-5 border border-border rounded-2xl hover:border-primary/50 hover:bg-secondary/30 transition-all duration-300 text-left group flex items-center gap-4 bg-background/50"
                >
                  <div className="p-3 bg-secondary rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <GraduationCap className="w-6 h-6 text-foreground/70 group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors">Student</h3>
                    <p className="text-xs text-muted-foreground">Academic queries & research</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-mono">Demo Access</p>
                <div className="mt-2 text-xs text-center space-y-1 text-muted-foreground/80 font-mono">
                  <p>Admin: admin@bitsdubai.ac.ae / admin@bits2024</p>
                  <p>Student: ansh.bandi@dubai.bits-pilani.ac.in / password123</p>
                </div>
              </div>
            </div>

          ) : (

            // Login Form
            <div className="space-y-6">
              <button
                onClick={() => setUserType(null)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors pl-1"
              >
                ← Change Role
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  {userType === "admin" ? <Shield className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {userType === "admin" ? "Admin Portal" : "Student Portal"}
                  </h2>
                  <p className="text-xs text-muted-foreground">Secure Authentication</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground ml-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={userType === "admin" ? "admin@bitsdubai.ac.ae" : "student@bits-pilani.ac.in"}
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50 font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground ml-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground placeholder:text-muted-foreground/50 font-medium"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                    <Lock className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive font-medium leading-tight">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </span>
                  ) : (
                    "Authenticate"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          Protected by Enterprise Grade Security
        </p>
      </div>
    </div>
  );
}
