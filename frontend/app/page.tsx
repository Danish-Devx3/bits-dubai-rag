"use client";

import { BookOpen, GraduationCap, FileText, Search, Zap, Shield, MessageSquare, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  BITS Dubai RAG Assistant
                </h1>
                <p className="text-xs text-gray-500">
                  University Information System
                </p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a 
                href="#features" 
                className="text-sm text-gray-900 hover:text-blue-700 transition-colors font-semibold no-underline"
              >
                Features
              </a>
              <a 
                href="#about" 
                className="text-sm text-gray-900 hover:text-blue-700 transition-colors font-semibold no-underline"
              >
                About
              </a>
              <Link href="/login">
                <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white hover:text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                  <LogIn className="w-4 h-4" />
                  Login
                </Button>
              </Link>
            </nav>
            <div className="md:hidden">
              <Link href="/login">
                <Button size="sm" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  <LogIn className="w-4 h-4" />
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
              <GraduationCap className="w-16 h-16 text-blue-600" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Your Intelligent University
              <br />
              <span className="text-blue-600">Information Assistant</span>
            </h1>
            <p className="text-xl text-gray-800 mb-8 max-w-2xl mx-auto font-medium">
              Get instant answers about courses, syllabi, assignments, and more.
              Powered by advanced RAG technology for accurate, context-aware responses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-6">
                  <LogIn className="w-5 h-5 mr-2" />
                  Get Started
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <FileText className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Powerful Features
              </h2>
              <p className="text-lg text-gray-800 max-w-2xl mx-auto font-medium">
                Everything you need to get instant answers about your university
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Search,
                  title: "Intelligent Search",
                  description: "Ask questions in natural language and get accurate, context-aware answers instantly.",
                },
                {
                  icon: Zap,
                  title: "Real-time Streaming",
                  description: "Watch responses stream in real-time for a smooth, interactive experience.",
                },
                {
                  icon: FileText,
                  title: "Document Upload",
                  description: "Upload course materials, syllabi, and documents to make them searchable.",
                },
                {
                  icon: Shield,
                  title: "Secure & Private",
                  description: "Your data is secure and processed with privacy in mind.",
                },
                {
                  icon: GraduationCap,
                  title: "Course Information",
                  description: "Get detailed information about courses, requirements, and schedules.",
                },
                {
                  icon: BookOpen,
                  title: "24/7 Available",
                  description: "Access information anytime, anywhere with our always-on assistant.",
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-800 font-medium">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="about" className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-lg text-gray-800 max-w-2xl mx-auto font-medium">
                Simple steps to get the information you need
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Login to Your Account",
                  description: "Sign in as a student or administrator to access the system.",
                },
                {
                  step: "2",
                  title: "Ask Your Question",
                  description: "Type your question in natural language. For example: 'What is the syllabus for 3rd year CSE?'",
                },
                {
                  step: "3",
                  title: "Get Instant Answers",
                  description: "Our AI searches through all uploaded documents and provides accurate, context-aware responses.",
                },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full text-2xl font-bold mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-800 font-medium">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 text-white py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Login to access the intelligent university information assistant!
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" variant="outline" className="bg-white text-blue-600 hover:bg-gray-100 border-white">
                  <LogIn className="w-5 h-5 mr-2" />
                  Login Now
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                BITS Dubai RAG Assistant
              </h3>
            </div>
            <p className="text-sm mb-4">
              © 2024 BITS Dubai. Powered by NoDevBuild.
            </p>
            <p className="text-xs opacity-75">
              Intelligent information retrieval for modern education
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
