"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Shield, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api";

type UserType = "admin" | "student" | null;

export default function LoginPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          // Verify token is still valid by calling /auth/me
          const profile = await authApi.getProfile();
          if (profile) {
            const storedUserType = localStorage.getItem("userType");
            if (storedUserType) {
              router.push(storedUserType === "admin" ? "/admin" : "/student");
            }
          }
        }
      } catch (error) {
        // Not authenticated, clear storage
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
      // Call backend API for authentication
      const response = await authApi.login(email, password);
      
      if (response.user) {
        // Determine user type from backend response (role field)
        const userRole = response.user.role || (userType || "student");
        const determinedUserType = userRole === "admin" ? "admin" : "student";
        
        // Store authentication data (token is in HttpOnly cookie)
        localStorage.setItem("userType", determinedUserType);
        localStorage.setItem("userEmail", email);
        // User data is already stored by authApi.login()
        
        // Redirect based on user type
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BITS Dubai
          </h1>
          <p className="text-gray-600 font-medium">
            University Information System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {!userType ? (
            // User Type Selection
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Select Your Role
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => handleUserTypeSelect("admin")}
                  className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Administrator
                      </h3>
                      <p className="text-sm text-gray-600">
                        Upload documents and manage content
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>

                <button
                  onClick={() => handleUserTypeSelect("student")}
                  className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <GraduationCap className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Student
                      </h3>
                      <p className="text-sm text-gray-600">
                        Ask questions and get information
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  <strong>Demo Credentials:</strong>
                  <br />
                  <span className="font-semibold">Admin:</span> admin@bitsdubai.ac.ae / admin@bits2024
                  <br />
                  <span className="font-semibold">Student:</span> ansh.bandi@dubai.bits-pilani.ac.in / password123
                </p>
              </div>
            </div>
          ) : (
            // Login Form
            <div>
              <button
                onClick={() => setUserType(null)}
                className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                ← Back to role selection
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-lg ${userType === "admin" ? "bg-blue-100" : "bg-indigo-100"}`}>
                  {userType === "admin" ? (
                    <Shield className="w-5 h-5 text-blue-600" />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {userType === "admin" ? "Admin Login" : "Student Login"}
                </h2>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={userType === "admin" ? "admin@bitsdubai.ac.ae" : "ansh.bandi@dubai.bits-pilani.ac.in"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 font-medium"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full py-3 text-base font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          © 2024 BITS Dubai. All rights reserved.
        </p>
      </div>
    </div>
  );
}

