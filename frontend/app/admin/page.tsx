"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DocumentUpload } from "@/components/admin/DocumentUpload";
import { LogOut, Shield, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authApi } from "@/lib/api";

export default function AdminPage() {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userType = localStorage.getItem("userType");
    
    // For admin, we check both token and userType
    // Note: Admin authentication can be added to backend later
    if (!token || userType !== "admin") {
      router.push("/login");
    }
  }, [router]);

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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">BITS Dubai</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2 border-gray-300 text-gray-900 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400"
            >
              <FileText className="w-4 h-4" />
              {showUpload ? "Hide" : "Upload"} Documents
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 border-gray-300 text-gray-900 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-400"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* Document Upload Modal/Drawer */}
        {showUpload && (
          <>
            {/* Backdrop - Light overlay */}
            <div 
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
              onClick={() => setShowUpload(false)}
            />
            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 md:w-[32rem] lg:max-w-2xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Document Upload</h2>
                </div>
                <button
                  onClick={() => setShowUpload(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 max-w-full">
                  <DocumentUpload />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Chat Interface - Full Screen */}
        <div className="h-full overflow-hidden">
          <ChatInterface fullScreen={true} />
        </div>
      </div>
    </div>
  );
}
