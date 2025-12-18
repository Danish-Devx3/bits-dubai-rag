"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, authApi } from "@/lib/api";
import { ArrowLeft, Search, User, BookOpen, GraduationCap, DollarSign, Calendar, Eye } from "lucide-react";

interface Student {
    id: string;
    studentId: string;
    name: string;
    email: string;
    program: string;
    status: string;
    campus?: string;
}

interface StudentDetails extends Student {
    gpa: number;
    cgpa: number;
    enrollments: any[];
    grades: any[];
    payments: any[];
    attendances: any[];
}

export default function StudentsPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            try {
                const profile = await authApi.getProfile();
                if (!profile || profile.role !== "admin") {
                    router.push("/login");
                    return;
                }

                const data = await adminApi.getAllStudents();
                setStudents(data);
            } catch (error) {
                console.error("Failed to fetch students", error);
            } finally {
                setLoading(false);
            }
        };
        checkAuthAndFetch();
    }, [router]);

    const handleViewDetails = async (id: string) => {
        setDetailsLoading(true);
        try {
            const details = await adminApi.getStudentDetails(id);
            setSelectedStudent(details);
        } catch (error) {
            console.error("Failed to fetch student details", error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.push("/admin")}
                        className="p-2 hover:bg-secondary rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Student Management
                    </h1>
                </div>

                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or email..."
                        className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-secondary/50 border-b border-border">
                                        <tr>
                                            <th className="p-4 font-semibold">ID</th>
                                            <th className="p-4 font-semibold">Name</th>
                                            <th className="p-4 font-semibold">Program</th>
                                            <th className="p-4 font-semibold">Campus</th>
                                            <th className="p-4 font-semibold">Status</th>
                                            <th className="p-4 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.id} className="hover:bg-secondary/30 transition-colors">
                                                <td className="p-4 font-mono">{student.studentId}</td>
                                                <td className="p-4 font-medium flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    {student.name}
                                                </td>
                                                <td className="p-4">{student.program}</td>
                                                <td className="p-4">{student.campus || 'N/A'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                                        }`}>
                                                        {student.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => handleViewDetails(student.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredStudents.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No students found matching your search.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Details Modal */}
                {selectedStudent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
                        <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedStudent.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedStudent.name}</h2>
                                        <p className="text-muted-foreground">{selectedStudent.studentId} • {selectedStudent.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-2 hover:bg-secondary rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                                    <div className="flex items-center gap-3 mb-2 text-primary">
                                        <GraduationCap className="w-5 h-5" />
                                        <span className="font-semibold">Academic</span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p>CGPA: <span className="font-mono font-bold">{selectedStudent.cgpa}</span></p>
                                        <p>Program: {selectedStudent.program}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                                    <div className="flex items-center gap-3 mb-2 text-green-500">
                                        <DollarSign className="w-5 h-5" />
                                        <span className="font-semibold">Payments</span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p>Pending: {selectedStudent.payments.filter((p: any) => p.status === 'pending').length}</p>
                                        <p>Last Paid: {selectedStudent.payments.find((p: any) => p.status === 'paid')?.paidDate?.split('T')[0] || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-secondary/30 rounded-xl border border-border">
                                    <div className="flex items-center gap-3 mb-2 text-blue-500">
                                        <BookOpen className="w-5 h-5" />
                                        <span className="font-semibold">Courses</span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p>Active Enrollments: {selectedStudent.enrollments.length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5" /> Recent Grades
                                    </h3>
                                    <div className="bg-secondary/20 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-secondary/50">
                                                <tr>
                                                    <th className="p-3 text-left">Course</th>
                                                    <th className="p-3 text-left">Semester</th>
                                                    <th className="p-3 text-left">Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedStudent.grades.slice(0, 5).map((grade: any) => (
                                                    <tr key={grade.id} className="border-t border-border/50">
                                                        <td className="p-3 font-medium">{grade.course?.courseName || grade.courseId}</td>
                                                        <td className="p-3">{grade.semester}</td>
                                                        <td className="p-3 font-bold">{grade.finalGrade || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
