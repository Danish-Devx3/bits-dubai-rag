"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LogOut, GraduationCap, BookOpen, DollarSign, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { studentApi, publicApi, authApi } from "@/lib/api";

export default function StudentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = localStorage.getItem("user");
        const userType = localStorage.getItem("userType");
        
        if (!userData || userType !== "student") {
          router.push("/login");
          return;
        }

        // Verify authentication by calling /auth/me
        const profile = await authApi.getProfile();
        if (profile && profile.role === "student") {
          setUser(profile);
          // Load academic summary
          loadSummary();
        } else {
          router.push("/login");
        }
      } catch (error) {
        // Not authenticated, redirect to login
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const loadSummary = async () => {
    try {
      const data = await studentApi.getAcademicSummary();
      setSummary(data);
    } catch (error) {
      console.error("Failed to load summary:", error);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    localStorage.removeItem("userType");
    localStorage.removeItem("userEmail");
    router.push("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {user?.name || "Student"}'s Portal
              </h1>
              <p className="text-xs text-gray-500">
                {user?.studentId || ""} • {user?.program || "BITS Dubai"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDashboard(!showDashboard)}
              className="flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {showDashboard ? "Chat" : "Dashboard"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 border-gray-300 text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      {showDashboard ? (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Dashboard</h2>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">GPA</p>
                    <p className="text-xl font-bold text-gray-900">{user?.gpa || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Enrolled Courses</p>
                    <p className="text-xl font-bold text-gray-900">
                      {summary?.enrollments?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payments</p>
                    <p className="text-xl font-bold text-gray-900">
                      {summary?.payments?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Grades</p>
                    <p className="text-xl font-bold text-gray-900">
                      {summary?.grades?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Grades */}
            {summary?.grades && summary.grades.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Grades</h3>
                <div className="space-y-3">
                  {summary.grades.slice(0, 5).map((grade: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">
                          {grade.courseCode} - {grade.courseName}
                        </p>
                        <p className="text-sm text-gray-600">{grade.semester}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {grade.finalGrade || grade.midSemGrade || "In Progress"}
                        </p>
                        {grade.totalMarks && (
                          <p className="text-sm text-gray-600">{grade.totalMarks.toFixed(1)}%</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enrolled Courses */}
            {summary?.enrollments && summary.enrollments.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrolled Courses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.enrollments.map((enrollment: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {enrollment.courseCode} - {enrollment.courseName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {enrollment.credits} credits • {enrollment.semester}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Status */}
            {summary?.payments && summary.payments.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
                <div className="space-y-2">
                  {summary.payments.map((payment: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payment.description}</p>
                        <p className="text-sm text-gray-600">
                          Due: {new Date(payment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{payment.amount.toLocaleString()}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            payment.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : payment.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ChatInterface fullScreen={true} />
        </div>
      )}
    </div>
  );
}

