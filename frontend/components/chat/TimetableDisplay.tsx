"use client";

import { Clock, MapPin, BookOpen } from "lucide-react";

interface CourseInfo {
    courseCode: string;
    courseName: string;
    department: string;
    credits: number;
}

interface TimetableSchedule {
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    room: string | null;
    type: string;
    course: CourseInfo;
}

interface TimetableDisplayProps {
    schedules: TimetableSchedule[];
    title?: string;
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEPARTMENT_COLORS: Record<string, string> = {
    CS: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
    MATH: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-700 dark:text-purple-300",
    GS: "from-green-500/20 to-green-600/10 border-green-500/30 text-green-700 dark:text-green-300",
    EE: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-300",
    ME: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-700 dark:text-orange-300",
    PHY: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-700 dark:text-red-300",
    CHEM: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-700 dark:text-pink-300",
    BIO: "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-700 dark:text-teal-300",
    DEFAULT: "from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-700 dark:text-gray-300",
};

function getDepartmentColor(dept: string): string {
    return DEPARTMENT_COLORS[dept.toUpperCase()] || DEPARTMENT_COLORS.DEFAULT;
}

function formatTime(time: string): string {
    // Handle both "HH:MM" and "HH:MM:SS" formats
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function ScheduleCard({ schedule }: { schedule: TimetableSchedule }) {
    const colorClass = getDepartmentColor(schedule.course.department);
    const typeLabel = schedule.type.charAt(0).toUpperCase() + schedule.type.slice(1);

    return (
        <div
            className={`relative p-3 rounded-xl border bg-gradient-to-br ${colorClass} transition-all hover:scale-[1.02] hover:shadow-md`}
        >
            {/* Course Code Badge */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                    {schedule.course.courseCode}
                </span>
                <span className="text-[10px] uppercase tracking-wide opacity-70">{typeLabel}</span>
            </div>

            {/* Course Name */}
            <h4 className="text-sm font-semibold mb-2 line-clamp-2">{schedule.course.courseName}</h4>

            {/* Time */}
            <div className="flex items-center gap-1.5 text-xs opacity-80 mb-1">
                <Clock size={12} />
                <span>
                    {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                </span>
            </div>

            {/* Room */}
            {schedule.room && (
                <div className="flex items-center gap-1.5 text-xs opacity-80">
                    <MapPin size={12} />
                    <span>{schedule.room}</span>
                </div>
            )}
        </div>
    );
}

export function TimetableDisplay({ schedules, title = "Course Timetable" }: TimetableDisplayProps) {
    if (!schedules || schedules.length === 0) {
        return (
            <div className="p-4 rounded-xl border border-border bg-secondary/30 text-center">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No timetable data available</p>
            </div>
        );
    }

    // Group schedules by day
    const schedulesByDay = schedules.reduce((acc, schedule) => {
        const day = schedule.dayOfWeek;
        if (!acc[day]) acc[day] = [];
        acc[day].push(schedule);
        return acc;
    }, {} as Record<string, TimetableSchedule[]>);

    // Sort each day's schedules by start time
    Object.keys(schedulesByDay).forEach((day) => {
        schedulesByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    // Get days with schedules in correct order
    const daysWithSchedules = DAYS_ORDER.filter((day) => schedulesByDay[day]?.length > 0);

    return (
        <div className="my-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                    {schedules.length} session{schedules.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Timetable Grid */}
            <div className="grid gap-4">
                {daysWithSchedules.map((day) => (
                    <div key={day} className="space-y-2">
                        {/* Day Header */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{day}</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Day's Schedules */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-2">
                            {schedulesByDay[day].map((schedule) => (
                                <ScheduleCard key={schedule.id} schedule={schedule} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Departments:</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(
                        schedules.reduce((acc, s) => {
                            acc[s.course.department] = true;
                            return acc;
                        }, {} as Record<string, boolean>)
                    ).map(([dept]) => (
                        <span
                            key={dept}
                            className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getDepartmentColor(dept)}`}
                        >
                            {dept}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
