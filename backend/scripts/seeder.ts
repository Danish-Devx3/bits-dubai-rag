import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';

/**
 * Seed script for 4 BITS Dubai students with RBAC data isolation
 * Each student can only access their own data via JWT authentication
 * 
 * Run with: npx ts-node scripts/seeder.ts
 */

async function seedDatabase() {
    console.log('🌱 Seeding database with 4 BITS students...');

    const mongoUrl = process.env.DATABASE_URL;
    if (!mongoUrl) {
        throw new Error('DATABASE_URL is not set');
    }

    const client = new MongoClient(mongoUrl);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await db.collection('attendances').deleteMany({}).catch(() => { });
        await db.collection('grades').deleteMany({}).catch(() => { });
        await db.collection('payments').deleteMany({}).catch(() => { });
        await db.collection('enrollments').deleteMany({}).catch(() => { });
        await db.collection('course_schedules').deleteMany({}).catch(() => { });
        await db.collection('academic_calendars').deleteMany({}).catch(() => { });
        await db.collection('courses').deleteMany({}).catch(() => { });
        await db.collection('students').deleteMany({}).catch(() => { });
        await db.collection('admins').deleteMany({}).catch(() => { });

        const hashedPassword = await bcrypt.hash('password123', 10);
        const currentSemester = 'FIRST SEMESTER 2025-2026';
        const pastSemester = 'FIRST SEMESTER 2024-2025';

        /* ==================== ADMIN ==================== */
        const adminId = new ObjectId();
        await db.collection('admins').insertOne({
            _id: adminId,
            adminId: 'ADMIN001',
            name: 'System Administrator',
            email: 'admin@bitsdubai.ac.ae',
            password: await bcrypt.hash('admin@bits2024', 10),
            role: 'admin',
            status: 'active',
        });
        console.log('👤 Created admin');

        /* ==================== STUDENTS ==================== */
        const student1Id = new ObjectId(); // Ayaan Shilledar
        const student2Id = new ObjectId(); // Rohan Mehta
        const student3Id = new ObjectId(); // Sara Khan
        const student4Id = new ObjectId(); // Aditya Verma
        const student5Id = new ObjectId(); // Shourya Tiwari
        const student6Id = new ObjectId(); // Rohan Gupta

        await db.collection('students').insertMany([
            {
                _id: student1Id,
                studentId: '2023A7PS0169U',
                name: 'Ayaan Shilledar',
                email: 'ayaan.shilledar@dubai.bits-pilani.ac.in',
                password: hashedPassword,
                program: 'B.E. Computer Science (AI/ML) – Dubai',
                gpa: 8.6,
                cgpa: 8.5,
                status: 'active',
            },
            {
                _id: student2Id,
                studentId: '2023A7PS0214U',
                name: 'Rohan Mehta',
                email: 'rohan.mehta@dubai.bits-pilani.ac.in',
                password: hashedPassword,
                program: 'B.E. Computer Science – Dubai',
                gpa: 7.9,
                cgpa: 8.0,
                status: 'active',
            },
            {
                _id: student3Id,
                studentId: '2023A7PS0347U',
                name: 'Sara Khan',
                email: 'sara.khan@dubai.bits-pilani.ac.in',
                password: hashedPassword,
                program: 'B.E. Electronics & Communication – Dubai',
                gpa: 9.1,
                cgpa: 9.0,
                status: 'active',
            },
            {
                _id: student4Id,
                studentId: '2023A7PS0489U',
                name: 'Aditya Verma',
                email: 'aditya.verma@dubai.bits-pilani.ac.in',
                password: hashedPassword,
                program: 'B.E. Mechanical Engineering – Dubai',
                gpa: 7.4,
                cgpa: 7.6,
                status: 'active',
            },
            {
                _id: student5Id,
                studentId: '2023A7PS0404U',
                erpId: '21120230404',
                name: 'Shourya Tiwari',
                email: 'f20230404@dubai.bits-pilani.ac.in',
                password: hashedPassword,
                program: 'B.E. Computer Science',
                campus: 'Dubai, UAE',
                gpa: 0.00,
                cgpa: 7.67,
                status: 'active',
                academicStatus: 'Normal / Active',
                practiceSchool: {
                    course: 'BITS F221 (Practice School I)',
                    station: 'IIT BHU',
                    supervisor: 'Prof. Dr. Ashutosh Mishra',
                    grade: 'A-',
                    units: 5.0,
                    semester: 'SUMMER 2024-2025',
                },
            },
            {
                _id: student6Id,
                studentId: '2023A7PS0567U',
                erpId: '21120230567',
                name: 'Rohan Gupta',
                email: 'f20230567@dubai.bits-pilani.ac.in',
                password: hashedPassword,
                program: 'B.E. Computer Science',
                campus: 'Dubai, UAE',
                gpa: 0.00,
                cgpa: 8.91,
                status: 'active',
                academicStatus: 'Normal / Dean\'s List',
                practiceSchool: {
                    course: 'BITS F221 (Practice School I)',
                    station: 'NTPC Limited (National Thermal Power Corporation)',
                    supervisor: 'Dr. Vilas Gaidhane',
                    grade: 'A',
                    units: 5.0,
                    semester: 'SUMMER 2024-2025',
                },
            },
        ]);
        console.log('👥 Created 6 students');

        /* ==================== COURSES ==================== */
        // CS Courses
        const csF213Id = new ObjectId();
        const csF214Id = new ObjectId();
        const csF222Id = new ObjectId();
        const csF301Id = new ObjectId();
        const csF342Id = new ObjectId();
        const csF351Id = new ObjectId();
        const csF363Id = new ObjectId();
        const csF372Id = new ObjectId();
        const csF211Id = new ObjectId();
        const csF111Id = new ObjectId(); // Computer Programming (Year 1)
        const csF415Id = new ObjectId(); // Data Mining

        // EEE Courses
        const eeeF212Id = new ObjectId();
        const eeeF241Id = new ObjectId();
        const eeeF311Id = new ObjectId();

        // ME Courses
        const meF211Id = new ObjectId();
        const meF212Id = new ObjectId();
        const meF311Id = new ObjectId();
        const meF312Id = new ObjectId();

        // Other Courses
        const mathF111Id = new ObjectId();
        const mathF112Id = new ObjectId();
        const mathF113Id = new ObjectId();
        const phyF110Id = new ObjectId();
        const hssF101Id = new ObjectId();

        // Additional courses for Shourya & Rohan
        const bitsF464Id = new ObjectId(); // Machine Learning
        const bitsF468Id = new ObjectId(); // New Venture Creation
        const gsF211Id = new ObjectId();   // Modern Political Concepts
        const psyF111Id = new ObjectId();  // Intro to Psychology

        await db.collection('courses').insertMany([
            // CS Courses
            { _id: csF111Id, courseCode: 'CS F111', courseName: 'Computer Programming', credits: 4, department: 'CS', type: 'core', isOpen: false },
            { _id: csF213Id, courseCode: 'CS F213', courseName: 'Object Oriented Programming', credits: 4, department: 'CS', type: 'core', isOpen: false },
            { _id: csF214Id, courseCode: 'CS F214', courseName: 'Logic in Computer Science', credits: 3, department: 'CS', type: 'core', isOpen: false },
            { _id: csF222Id, courseCode: 'CS F222', courseName: 'Discrete Structures', credits: 3, department: 'CS', type: 'core', isOpen: true },
            { _id: csF301Id, courseCode: 'CS F301', courseName: 'Principles of Programming Languages', credits: 2, department: 'CS', type: 'core', isOpen: true },
            { _id: csF342Id, courseCode: 'CS F342', courseName: 'Computer Architecture', credits: 4, department: 'CS', type: 'core', isOpen: true },
            { _id: csF351Id, courseCode: 'CS F351', courseName: 'Theory of Computation', credits: 3, department: 'CS', type: 'core', isOpen: true },
            { _id: csF363Id, courseCode: 'CS F363', courseName: 'Compiler Construction', credits: 3, department: 'CS', type: 'core', isOpen: true },
            { _id: csF372Id, courseCode: 'CS F372', courseName: 'Operating Systems', credits: 3, department: 'CS', type: 'core', isOpen: true },
            { _id: csF211Id, courseCode: 'CS F211', courseName: 'Data Structures & Algorithms', credits: 4, department: 'CS', type: 'core', isOpen: false },
            { _id: csF415Id, courseCode: 'CS F415', courseName: 'Data Mining', credits: 3, department: 'CS', type: 'elective', isOpen: true },

            // EEE Courses
            { _id: eeeF212Id, courseCode: 'EEE F212', courseName: 'Digital Design', credits: 4, department: 'EEE', type: 'core', isOpen: false },
            { _id: eeeF241Id, courseCode: 'EEE F241', courseName: 'Microprocessors', credits: 4, department: 'EEE', type: 'core', isOpen: true },
            { _id: eeeF311Id, courseCode: 'EEE F311', courseName: 'Communication Systems', credits: 3, department: 'EEE', type: 'core', isOpen: true },

            // ME Courses
            { _id: meF211Id, courseCode: 'ME F211', courseName: 'Thermodynamics', credits: 3, department: 'ME', type: 'core', isOpen: false },
            { _id: meF212Id, courseCode: 'ME F212', courseName: 'Fluid Mechanics', credits: 3, department: 'ME', type: 'core', isOpen: true },
            { _id: meF311Id, courseCode: 'ME F311', courseName: 'Heat Transfer', credits: 3, department: 'ME', type: 'core', isOpen: true },
            { _id: meF312Id, courseCode: 'ME F312', courseName: 'Machine Design', credits: 3, department: 'ME', type: 'core', isOpen: true },

            // Other Courses
            { _id: mathF111Id, courseCode: 'MATH F111', courseName: 'Probability & Statistics', credits: 3, department: 'MATH', type: 'core', isOpen: false },
            { _id: mathF112Id, courseCode: 'MATH F112', courseName: 'Calculus II', credits: 3, department: 'MATH', type: 'core', isOpen: true },
            { _id: mathF113Id, courseCode: 'MATH F113', courseName: 'Linear Algebra', credits: 3, department: 'MATH', type: 'core', isOpen: true },
            { _id: phyF110Id, courseCode: 'PHY F110', courseName: 'Engineering Physics', credits: 3, department: 'PHY', type: 'core', isOpen: true },
            { _id: hssF101Id, courseCode: 'HSS F101', courseName: 'Technical Communication', credits: 2, department: 'HSS', type: 'elective', isOpen: true },

            // Additional courses for Shourya & Rohan
            { _id: bitsF464Id, courseCode: 'BITS F464', courseName: 'Machine Learning', credits: 3, department: 'CS', type: 'elective', isOpen: true },
            { _id: bitsF468Id, courseCode: 'BITS F468', courseName: 'New Venture Creation', credits: 3, department: 'MGMT', type: 'elective', isOpen: true },
            { _id: gsF211Id, courseCode: 'GS F211', courseName: 'Modern Political Concepts', credits: 3, department: 'HSS', type: 'open_elective', isOpen: true },
            { _id: psyF111Id, courseCode: 'PSY F111', courseName: 'Intro to Psychology', credits: 3, department: 'HSS', type: 'open_elective', isOpen: true },
        ]);
        console.log('📚 Created courses');

        /* ==================== ENROLLMENTS (Current Semester) ==================== */
        await db.collection('enrollments').insertMany([
            // Ayaan - CS courses
            { studentId: student1Id, courseId: csF301Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student1Id, courseId: csF342Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student1Id, courseId: csF351Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student1Id, courseId: csF372Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },

            // Rohan Mehta - CS courses
            { studentId: student2Id, courseId: csF301Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student2Id, courseId: csF363Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student2Id, courseId: csF372Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },

            // Sara - EEE courses
            { studentId: student3Id, courseId: eeeF241Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student3Id, courseId: eeeF311Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student3Id, courseId: mathF113Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },

            // Aditya - ME courses
            { studentId: student4Id, courseId: meF212Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student4Id, courseId: meF311Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },
            { studentId: student4Id, courseId: meF312Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },

            // Shourya Tiwari - 7 courses
            { studentId: student5Id, courseId: bitsF464Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() }, // Machine Learning
            { studentId: student5Id, courseId: bitsF468Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() }, // New Venture Creation
            { studentId: student5Id, courseId: csF301Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // POPL
            { studentId: student5Id, courseId: csF342Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Computer Architecture
            { studentId: student5Id, courseId: csF351Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Theory of Computation
            { studentId: student5Id, courseId: csF372Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Operating Systems
            { studentId: student5Id, courseId: gsF211Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Modern Political Concepts

            // Rohan Gupta - 6 courses
            { studentId: student6Id, courseId: csF415Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Data Mining
            { studentId: student6Id, courseId: csF301Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // POPL
            { studentId: student6Id, courseId: csF342Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Computer Architecture
            { studentId: student6Id, courseId: csF351Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Theory of Computation
            { studentId: student6Id, courseId: csF372Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },   // Operating Systems
            { studentId: student6Id, courseId: psyF111Id, semester: currentSemester, status: 'enrolled', enrolledAt: new Date() },  // Intro to Psychology
        ]);
        console.log('📝 Created enrollments');

        /* ==================== GRADES (Past Semester - Completed) ==================== */
        const year1Sem1 = 'FIRST SEMESTER 2023-2024';
        const year2Sem1 = 'FIRST SEMESTER 2024-2025';

        await db.collection('grades').insertMany([
            // Ayaan's past grades
            { studentId: student1Id, courseId: csF213Id, semester: pastSemester, midSemMarks: 75, midSemGrade: 'C', finalMarks: 78, finalGrade: 'C', totalMarks: 76.5, gpa: 6.0, status: 'completed' },
            { studentId: student1Id, courseId: mathF111Id, semester: pastSemester, midSemMarks: 90, midSemGrade: 'A', finalMarks: 92, finalGrade: 'A', totalMarks: 91, gpa: 10.0, status: 'completed' },
            { studentId: student1Id, courseId: csF214Id, semester: pastSemester, midSemMarks: 85, midSemGrade: 'B', finalMarks: 88, finalGrade: 'B', totalMarks: 86.5, gpa: 8.0, status: 'completed' },

            // Rohan Mehta's past grades
            { studentId: student2Id, courseId: csF211Id, semester: pastSemester, midSemMarks: 78, midSemGrade: 'C', finalMarks: 81, finalGrade: 'B', totalMarks: 79.5, gpa: 7.0, status: 'completed' },
            { studentId: student2Id, courseId: csF213Id, semester: pastSemester, midSemMarks: 72, midSemGrade: 'C', finalMarks: 75, finalGrade: 'C', totalMarks: 73.5, gpa: 6.0, status: 'completed' },

            // Sara's past grades
            { studentId: student3Id, courseId: eeeF212Id, semester: pastSemester, midSemMarks: 92, midSemGrade: 'A', finalMarks: 94, finalGrade: 'A', totalMarks: 93, gpa: 10.0, status: 'completed' },
            { studentId: student3Id, courseId: mathF111Id, semester: pastSemester, midSemMarks: 88, midSemGrade: 'A', finalMarks: 90, finalGrade: 'A', totalMarks: 89, gpa: 9.0, status: 'completed' },

            // Aditya's past grades
            { studentId: student4Id, courseId: meF211Id, semester: pastSemester, midSemMarks: 70, midSemGrade: 'C', finalMarks: 73, finalGrade: 'C', totalMarks: 71.5, gpa: 6.0, status: 'completed' },
            { studentId: student4Id, courseId: phyF110Id, semester: pastSemester, midSemMarks: 75, midSemGrade: 'C', finalMarks: 78, finalGrade: 'C', totalMarks: 76.5, gpa: 6.0, status: 'completed' },

            // ============ SHOURYA TIWARI GRADES ============
            // Year 1 Semester 1 - Computer Programming A-
            { studentId: student5Id, courseId: csF111Id, semester: year1Sem1, finalGrade: 'A-', gpa: 9.0, status: 'completed' },
            // Year 2 Semester 1 - OOP B-, Logic B
            { studentId: student5Id, courseId: csF213Id, semester: year2Sem1, finalGrade: 'B-', gpa: 7.0, status: 'completed' },
            { studentId: student5Id, courseId: csF214Id, semester: year2Sem1, finalGrade: 'B', gpa: 8.0, status: 'completed' },
            // Current semester (in_progress)
            { studentId: student5Id, courseId: bitsF464Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student5Id, courseId: csF342Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student5Id, courseId: csF301Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student5Id, courseId: csF351Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student5Id, courseId: csF372Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student5Id, courseId: gsF211Id, semester: currentSemester, status: 'in_progress' },

            // ============ ROHAN GUPTA GRADES (Dean's List) ============
            // Year 1 Semester 1 - Computer Programming A
            { studentId: student6Id, courseId: csF111Id, semester: year1Sem1, finalGrade: 'A', gpa: 10.0, status: 'completed' },
            // Year 2 Semester 1 - OOP A, Logic A-
            { studentId: student6Id, courseId: csF213Id, semester: year2Sem1, finalGrade: 'A', gpa: 10.0, status: 'completed' },
            { studentId: student6Id, courseId: csF214Id, semester: year2Sem1, finalGrade: 'A-', gpa: 9.0, status: 'completed' },
            // Current semester (in_progress)
            { studentId: student6Id, courseId: csF415Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student6Id, courseId: csF342Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student6Id, courseId: csF301Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student6Id, courseId: csF351Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student6Id, courseId: csF372Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student6Id, courseId: psyF111Id, semester: currentSemester, status: 'in_progress' },

            // Current semester grades for existing students (in_progress)
            { studentId: student1Id, courseId: csF301Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student1Id, courseId: csF342Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student2Id, courseId: csF301Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student3Id, courseId: eeeF241Id, semester: currentSemester, status: 'in_progress' },
            { studentId: student4Id, courseId: meF212Id, semester: currentSemester, status: 'in_progress' },
        ]);
        console.log('📊 Created grades');

        /* ==================== PAYMENTS ==================== */
        await db.collection('payments').insertMany([
            // Ayaan's payments
            { studentId: student1Id, semester: currentSemester, amount: 150000, status: 'paid', dueDate: new Date('2025-08-15'), paidDate: new Date('2025-08-10'), paymentMethod: 'Online Transfer', transactionId: 'TXN2025081001', description: 'Tuition Fee - First Semester 2025-2026' },
            { studentId: student1Id, semester: currentSemester, amount: 5000, status: 'pending', dueDate: new Date('2025-12-01'), description: 'Library Fee' },

            // Rohan Mehta's payments
            { studentId: student2Id, semester: currentSemester, amount: 150000, status: 'paid', dueDate: new Date('2025-08-15'), paidDate: new Date('2025-08-12'), paymentMethod: 'Credit Card', transactionId: 'TXN2025081202', description: 'Tuition Fee - First Semester 2025-2026' },
            { studentId: student2Id, semester: currentSemester, amount: 25000, status: 'pending', dueDate: new Date('2025-10-01'), description: 'Hostel Fee' },

            // Sara's payments
            { studentId: student3Id, semester: currentSemester, amount: 150000, status: 'paid', dueDate: new Date('2025-08-15'), paidDate: new Date('2025-08-05'), paymentMethod: 'Bank Transfer', transactionId: 'TXN2025080503', description: 'Tuition Fee - First Semester 2025-2026' },
            { studentId: student3Id, semester: currentSemester, amount: 7000, status: 'paid', dueDate: new Date('2025-09-01'), paidDate: new Date('2025-08-28'), paymentMethod: 'Online Transfer', transactionId: 'TXN2025082803', description: 'Lab Fee' },

            // Aditya's payments
            { studentId: student4Id, semester: currentSemester, amount: 150000, status: 'pending', dueDate: new Date('2025-08-15'), description: 'Tuition Fee - First Semester 2025-2026' },
            { studentId: student4Id, semester: currentSemester, amount: 6000, status: 'pending', dueDate: new Date('2025-11-10'), description: 'Workshop Fee' },

            // Shourya Tiwari's payments (0.00 AED outstanding - cleared)
            { studentId: student5Id, semester: currentSemester, amount: 150000, status: 'paid', dueDate: new Date('2025-08-15'), paidDate: new Date('2025-08-05'), paymentMethod: 'Online Transfer', transactionId: 'TXN202508050404', description: 'Tuition Fee - First Semester 2025-2026 (Cleared)' },

            // Rohan Gupta's payments (0.00 AED outstanding - cleared, last payment 24,500 AED)
            { studentId: student6Id, semester: currentSemester, amount: 24500, status: 'paid', dueDate: new Date('2025-08-15'), paidDate: new Date('2025-08-10'), paymentMethod: 'Online Transfer', transactionId: 'TXN202508100567', description: 'Tuition and Hostel Fees - First Semester 2025-2026 (Cleared)' },
        ]);
        console.log('💰 Created payments');

        /* ==================== EXAM SCHEDULES (Winter 2025) ==================== */
        await db.collection('exam_schedules').insertMany([
            // Common exams for CS students
            { courseId: csF351Id, courseCode: 'CS F351', courseName: 'Theory of Computation', examType: 'comprehensive', date: new Date('2025-12-22T14:00:00'), session: 'Afternoon', semester: currentSemester },
            { courseId: csF301Id, courseCode: 'CS F301', courseName: 'Principles of Programming Languages', examType: 'comprehensive', date: new Date('2025-12-23T14:00:00'), session: 'Afternoon', semester: currentSemester },
            { courseId: csF342Id, courseCode: 'CS F342', courseName: 'Computer Architecture', examType: 'comprehensive', date: new Date('2025-12-24T14:00:00'), session: 'Afternoon', semester: currentSemester },
            { courseId: csF372Id, courseCode: 'CS F372', courseName: 'Operating Systems', examType: 'comprehensive', date: new Date('2025-12-29T14:00:00'), session: 'Afternoon', semester: currentSemester },
            { courseId: csF415Id, courseCode: 'CS F415', courseName: 'Data Mining', examType: 'comprehensive', date: new Date('2025-12-30T14:00:00'), session: 'Afternoon', semester: currentSemester },
            { courseId: bitsF464Id, courseCode: 'BITS F464', courseName: 'Machine Learning', examType: 'comprehensive', date: new Date('2025-12-31T14:00:00'), session: 'Afternoon', semester: currentSemester },
            { courseId: gsF211Id, courseCode: 'GS F211', courseName: 'Modern Political Concepts', examType: 'comprehensive', date: new Date('2025-12-31T09:00:00'), session: 'Morning', semester: currentSemester },
            { courseId: psyF111Id, courseCode: 'PSY F111', courseName: 'Intro to Psychology', examType: 'comprehensive', date: new Date('2025-12-30T09:00:00'), session: 'Morning', semester: currentSemester },
        ]);
        console.log('📋 Created exam schedules');

        /* ==================== ATTENDANCE ==================== */
        const attendanceRecords: any[] = [];
        const attendanceDates = [
            new Date('2025-11-05T09:00:00'),
            new Date('2025-11-07T09:00:00'),
            new Date('2025-11-12T09:00:00'),
            new Date('2025-11-14T09:00:00'),
        ];

        // Ayaan's attendance
        for (const date of attendanceDates) {
            attendanceRecords.push({
                studentId: student1Id,
                courseId: csF301Id,
                date,
                startTime: new Date(date),
                endTime: new Date(date.getTime() + 50 * 60000),
                status: Math.random() > 0.2 ? 'present' : 'absent',
                points: Math.random() > 0.2 ? 1 : 0,
                remarks: 'Self-recorded',
            });
        }

        // Rohan's attendance
        for (const date of attendanceDates) {
            attendanceRecords.push({
                studentId: student2Id,
                courseId: csF301Id,
                date,
                startTime: new Date(date),
                endTime: new Date(date.getTime() + 50 * 60000),
                status: Math.random() > 0.3 ? 'present' : 'absent',
                points: Math.random() > 0.3 ? 1 : 0,
                remarks: 'Self-recorded',
            });
        }

        // Sara's attendance
        for (const date of attendanceDates) {
            attendanceRecords.push({
                studentId: student3Id,
                courseId: eeeF241Id,
                date,
                startTime: new Date(date),
                endTime: new Date(date.getTime() + 50 * 60000),
                status: 'present', // Sara has perfect attendance
                points: 1,
                remarks: 'Self-recorded',
            });
        }

        // Aditya's attendance
        for (const date of attendanceDates) {
            attendanceRecords.push({
                studentId: student4Id,
                courseId: meF212Id,
                date,
                startTime: new Date(date),
                endTime: new Date(date.getTime() + 50 * 60000),
                status: Math.random() > 0.4 ? 'present' : 'absent',
                points: Math.random() > 0.4 ? 1 : 0,
                remarks: 'Self-recorded',
            });
        }

        // Shourya Tiwari's attendance (avg 69.6% across all courses)
        const shouryaCourses = [
            { id: csF342Id, rate: 0.63 },    // Computer Architecture 63%
            { id: bitsF464Id, rate: 0.68 },  // Machine Learning 68%
            { id: gsF211Id, rate: 0.615 },   // Modern Political Concepts 61.5%
            { id: csF372Id, rate: 0.614 },   // Operating Systems 61.4%
            { id: csF301Id, rate: 0.679 },   // Principles of Prog Lang 67.9%
            { id: csF351Id, rate: 0.75 },    // Theory of Computation 75%
        ];
        for (const course of shouryaCourses) {
            for (const date of attendanceDates) {
                const isPresent = Math.random() < course.rate;
                attendanceRecords.push({
                    studentId: student5Id,
                    courseId: course.id,
                    date,
                    startTime: new Date(date),
                    endTime: new Date(date.getTime() + 50 * 60000),
                    status: isPresent ? 'present' : 'absent',
                    points: isPresent ? 1 : 0,
                    remarks: 'Self-recorded',
                });
            }
        }

        // Rohan Gupta's attendance (avg 88.5% across all courses)
        const rohanCourses = [
            { id: csF342Id, rate: 0.889 },   // Computer Architecture 88.9%
            { id: csF415Id, rate: 0.90 },    // Data Mining 90%
            { id: psyF111Id, rate: 0.80 },   // Intro to Psychology 80%
            { id: csF372Id, rate: 0.877 },   // Operating Systems 87.7%
            { id: csF301Id, rate: 0.928 },   // Principles of Prog Lang 92.8%
            { id: csF351Id, rate: 0.904 },   // Theory of Computation 90.4%
        ];
        for (const course of rohanCourses) {
            for (const date of attendanceDates) {
                const isPresent = Math.random() < course.rate;
                attendanceRecords.push({
                    studentId: student6Id,
                    courseId: course.id,
                    date,
                    startTime: new Date(date),
                    endTime: new Date(date.getTime() + 50 * 60000),
                    status: isPresent ? 'present' : 'absent',
                    points: isPresent ? 1 : 0,
                    remarks: 'Self-recorded',
                });
            }
        }

        await db.collection('attendances').insertMany(attendanceRecords);
        console.log('📅 Created attendance records');

        /* ==================== COURSE SCHEDULES ==================== */
        await db.collection('course_schedules').insertMany([
            { courseId: csF301Id, dayOfWeek: 'Monday', startTime: '09:20', endTime: '10:10', room: 'A101', semester: currentSemester, type: 'lecture' },
            { courseId: csF342Id, dayOfWeek: 'Tuesday', startTime: '10:15', endTime: '11:05', room: 'B202', semester: currentSemester, type: 'lecture' },
            { courseId: csF351Id, dayOfWeek: 'Wednesday', startTime: '14:50', endTime: '15:40', room: 'A103', semester: currentSemester, type: 'lecture' },
            { courseId: csF372Id, dayOfWeek: 'Thursday', startTime: '11:10', endTime: '12:00', room: 'Lab1', semester: currentSemester, type: 'lab' },
            { courseId: eeeF241Id, dayOfWeek: 'Monday', startTime: '11:10', endTime: '12:00', room: 'E101', semester: currentSemester, type: 'lecture' },
            { courseId: meF311Id, dayOfWeek: 'Friday', startTime: '09:20', endTime: '10:10', room: 'M201', semester: currentSemester, type: 'lecture' },
            { courseId: bitsF464Id, dayOfWeek: 'Wednesday', startTime: '13:55', endTime: '14:45', room: 'A201', semester: currentSemester, type: 'lecture' },
            { courseId: gsF211Id, dayOfWeek: 'Wednesday', startTime: '12:05', endTime: '12:55', room: 'H101', semester: currentSemester, type: 'lecture' },
        ]);
        console.log('🗓️  Created course schedules');

        /* ==================== ACADEMIC CALENDAR ==================== */
        await db.collection('academic_calendars').insertMany([
            { semester: currentSemester, eventType: 'registration', title: 'Course Registration Opens', startDate: new Date('2025-07-01'), endDate: new Date('2025-07-15'), description: 'Open enrollment period for courses', isActive: true },
            { semester: currentSemester, eventType: 'midsem', title: 'Mid-Semester Examinations', startDate: new Date('2025-10-15'), endDate: new Date('2025-10-25'), description: 'Mid-semester examination period', isActive: true },
            { semester: currentSemester, eventType: 'endsem', title: 'End-Semester Examinations', startDate: new Date('2025-12-10'), endDate: new Date('2025-12-20'), description: 'End-semester examination period', isActive: true },
        ]);
        console.log('📆 Created academic calendar');

        console.log('\n✅ Database seeded successfully!');
        console.log('\n📋 Student Credentials (password for all: password123):');
        console.log('   1. ayaan.shilledar@dubai.bits-pilani.ac.in');
        console.log('   2. rohan.mehta@dubai.bits-pilani.ac.in');
        console.log('   3. sara.khan@dubai.bits-pilani.ac.in');
        console.log('   4. aditya.verma@dubai.bits-pilani.ac.in');
        console.log('   5. f20230404@dubai.bits-pilani.ac.in (Shourya Tiwari)');
        console.log('   6. f20230567@dubai.bits-pilani.ac.in (Rohan Gupta)');
        console.log('\n👤 Admin: admin@bitsdubai.ac.ae (password: admin@bits2024)');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        await client.close();
    }
}

// Run the seeder
seedDatabase();
