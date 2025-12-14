import { PrismaClient } from '@prisma/client';
import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(prisma: PrismaClient) {
  console.log('🌱 Seeding database...');

  // Use native MongoDB driver for seeding to avoid transaction requirements
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
    console.log('Clearing existing data...');
    await db.collection('attendances').deleteMany({}).catch(() => { });
    await db.collection('grades').deleteMany({}).catch(() => { });
    await db.collection('payments').deleteMany({}).catch(() => { });
    await db.collection('enrollments').deleteMany({}).catch(() => { });
    await db.collection('course_schedules').deleteMany({}).catch(() => { });
    await db.collection('academic_calendars').deleteMany({}).catch(() => { });
    await db.collection('courses').deleteMany({}).catch(() => { });
    await db.collection('students').deleteMany({}).catch(() => { });
    await db.collection('admins').deleteMany({}).catch(() => { });

    // Create Admin
    const adminHashedPassword = await bcrypt.hash('admin@bits2024', 10);
    const adminId = new ObjectId();

    await db.collection('admins').insertOne({
      _id: adminId,
      adminId: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@bitsdubai.ac.ae',
      password: adminHashedPassword,
      role: 'admin',
      status: 'active',
    });

    // Create Students
    const hashedPassword = await bcrypt.hash('password123', 10);
    const student1Id = new ObjectId();
    const student2Id = new ObjectId();
    const student3Id = new ObjectId(); // Shourya Tiwari
    const student4Id = new ObjectId(); // Rohan Gupta

    await db.collection('students').insertMany([
      {
        _id: student1Id,
        studentId: '2023A7PS0169U',
        erpId: '21120230169',
        name: 'ANSH BANDI',
        email: 'ansh.bandi@dubai.bits-pilani.ac.in',
        password: hashedPassword,
        program: 'B.E. Computer Science',
        campus: 'Dubai, UAE',
        gpa: 0.00, // Current semester in progress
        cgpa: 8.15,
        status: 'active',
        academicStatus: 'Normal / Active',
        practiceSchool: {
          course: 'BITS F221',
          station: 'Microsoft India Development Center',
          supervisor: 'Dr. Rajesh Kumar',
          grade: 'A',
          units: 5.0,
        },
      },
      {
        _id: student2Id,
        studentId: '2023A7PS0170U',
        erpId: '21120230170',
        name: 'JOHN DOE',
        email: 'john.doe@dubai.bits-pilani.ac.in',
        password: hashedPassword,
        program: 'B.E. Computer Science',
        campus: 'Dubai, UAE',
        gpa: 0.00, // Current semester in progress
        cgpa: 7.8,
        status: 'active',
        academicStatus: 'Normal / Active',
        practiceSchool: {
          course: 'BITS F221',
          station: 'Amazon Web Services',
          supervisor: 'Prof. Anita Sharma',
          grade: 'B+',
          units: 5.0,
        },
      },
      {
        _id: student3Id,
        studentId: '2023A7PS0404U',
        erpId: '21120230404',
        name: 'SHOURYA TIWARI',
        email: 'f20230404@dubai.bits-pilani.ac.in',
        password: hashedPassword,
        program: 'B.E. Computer Science',
        campus: 'Dubai, UAE',
        gpa: 0.00, // Current semester in progress
        cgpa: 7.67,
        status: 'active',
        academicStatus: 'Normal / Active',
        practiceSchool: {
          course: 'BITS F221',
          station: 'IIT BHU',
          supervisor: 'Prof. Dr. Ashutosh Mishra',
          grade: 'A-',
          units: 5.0,
        },
      },
      {
        _id: student4Id,
        studentId: '2023A7PS0567U',
        erpId: '21120230567',
        name: 'ROHAN GUPTA',
        email: 'f20230567@dubai.bits-pilani.ac.in',
        password: hashedPassword,
        program: 'B.E. Computer Science',
        campus: 'Dubai, UAE',
        gpa: 0.00, // Current semester in progress
        cgpa: 8.91,
        status: 'active',
        academicStatus: 'Normal / Dean\'s List',
        practiceSchool: {
          course: 'BITS F221',
          station: 'NTPC Limited (National Thermal Power Corporation)',
          supervisor: 'Dr. Vilas Gaidhane',
          grade: 'A',
          units: 5.0,
        },
      },
    ]);

    // Create Courses
    const course1Id = new ObjectId();
    const course2Id = new ObjectId();
    const course3Id = new ObjectId();
    const course4Id = new ObjectId();
    const course5Id = new ObjectId();
    const course6Id = new ObjectId();
    const course7Id = new ObjectId();
    const course8Id = new ObjectId();
    const course9Id = new ObjectId();  // Data Mining
    const course10Id = new ObjectId(); // Intro to Psychology
    const course11Id = new ObjectId(); // New Venture Creation

    await db.collection('courses').insertMany([
      {
        _id: course1Id,
        courseCode: 'CS F301',
        courseName: 'PRINCIPLES OF PROGG LANG',
        credits: 3,
        department: 'CS',
        description: 'Introduction to programming language principles',
        type: 'core',
        isOpen: true,
      },
      {
        _id: course2Id,
        courseCode: 'CS F342',
        courseName: 'COMPUTER ARCHITECTURE',
        credits: 4,
        department: 'CS',
        description: 'Computer organization and architecture',
        type: 'core',
        isOpen: true,
      },
      {
        _id: course3Id,
        courseCode: 'CS F351',
        courseName: 'THEORY OF COMPUTATION',
        credits: 3,
        department: 'CS',
        description: 'Formal languages and automata theory',
        type: 'core',
        isOpen: true,
      },
      {
        _id: course4Id,
        courseCode: 'CS F372',
        courseName: 'OPERATING SYSTEMS',
        credits: 4,
        department: 'CS',
        description: 'Operating system concepts and design',
        type: 'core',
        isOpen: true,
      },
      {
        _id: course5Id,
        courseCode: 'BITS F464',
        courseName: 'MACHINE LEARNING',
        credits: 3,
        department: 'CS',
        description: 'Introduction to machine learning algorithms',
        type: 'elective',
        isOpen: true,
      },
      {
        _id: course6Id,
        courseCode: 'GS F211',
        courseName: 'MOD POLITICAL CONCEPTS',
        credits: 2,
        department: 'GS',
        description: 'Modern political concepts and theories',
        type: 'open_elective',
        isOpen: true,
      },
      {
        _id: course7Id,
        courseCode: 'CS F213',
        courseName: 'OBJECT ORIENTED PROG',
        credits: 4,
        department: 'CS',
        description: 'Object-oriented programming concepts',
        type: 'core',
        isOpen: false,
      },
      {
        _id: course8Id,
        courseCode: 'CS F214',
        courseName: 'LOGIC IN COMPUTER SCIENCE',
        credits: 3,
        department: 'CS',
        description: 'Mathematical logic for computer science',
        type: 'core',
        isOpen: false,
      },
      {
        _id: course9Id,
        courseCode: 'CS F415',
        courseName: 'DATA MINING',
        credits: 3,
        department: 'CS',
        description: 'Advanced data mining techniques and algorithms',
        type: 'elective',
        isOpen: true,
      },
      {
        _id: course10Id,
        courseCode: 'PSY F111',
        courseName: 'INTRO TO PSYCHOLOGY',
        credits: 3,
        department: 'HSS',
        description: 'Introduction to psychological concepts and theories',
        type: 'open_elective',
        isOpen: true,
      },
      {
        _id: course11Id,
        courseCode: 'BITS F468',
        courseName: 'NEW VENTURE CREATION',
        credits: 3,
        department: 'MGMT',
        description: 'Entrepreneurship and startup creation',
        type: 'elective',
        isOpen: true,
      },
    ]);

    const currentSemester = 'FIRST SEMESTER 2025-2026';
    const pastSemester = 'FIRST SEMESTER 2024-2025';

    // Create Enrollments
    await db.collection('enrollments').insertMany([
      // Ansh Bandi enrollments (student1Id)
      {
        studentId: student1Id,
        courseId: course1Id, // CS F301
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course2Id, // CS F342
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course3Id, // CS F351
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course4Id, // CS F372
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course5Id, // BITS F464 Machine Learning
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course6Id, // GS F211
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      // John Doe enrollments (student2Id)
      {
        studentId: student2Id,
        courseId: course1Id, // CS F301
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student2Id,
        courseId: course2Id, // CS F342
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student2Id,
        courseId: course3Id, // CS F351
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student2Id,
        courseId: course4Id, // CS F372
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student2Id,
        courseId: course9Id, // CS F415 Data Mining
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student2Id,
        courseId: course10Id, // PSY F111
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      // Shourya Tiwari enrollments (student3Id)
      // BITS F464 Machine Learning, BITS F468 New Venture Creation, CS F301, CS F342, CS F351, CS F372, GS F211
      {
        studentId: student3Id,
        courseId: course5Id, // BITS F464 Machine Learning
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student3Id,
        courseId: course11Id, // BITS F468 New Venture Creation
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student3Id,
        courseId: course1Id, // CS F301
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student3Id,
        courseId: course2Id, // CS F342
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student3Id,
        courseId: course3Id, // CS F351
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student3Id,
        courseId: course4Id, // CS F372
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student3Id,
        courseId: course6Id, // GS F211
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      // Rohan Gupta enrollments (student4Id)
      // CS F415 Data Mining, CS F301, CS F342, CS F351, CS F372, PSY F111
      {
        studentId: student4Id,
        courseId: course9Id, // CS F415 Data Mining
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student4Id,
        courseId: course1Id, // CS F301
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student4Id,
        courseId: course2Id, // CS F342
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student4Id,
        courseId: course3Id, // CS F351
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student4Id,
        courseId: course4Id, // CS F372
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student4Id,
        courseId: course10Id, // PSY F111
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
    ]);

    // Create Grades
    await db.collection('grades').insertMany([
      // Ansh Bandi current semester grades (in progress)
      {
        studentId: student1Id,
        courseId: course1Id, // Principles of Programming Lang
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course2Id, // Computer Architecture
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course3Id, // Theory of Computation
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course4Id, // Operating Systems
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course5Id, // Machine Learning
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course6Id, // Modern Political Concepts
        semester: currentSemester,
        status: 'in_progress',
      },
      // Ansh Bandi historical grades (Year 2 Semester 1)
      {
        studentId: student1Id,
        courseId: course7Id, // OOP - B+
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'B+',
        gpa: 8.0,
        status: 'completed',
      },
      {
        studentId: student1Id,
        courseId: course8Id, // Logic in CS - A-
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'A-',
        gpa: 9.0,
        status: 'completed',
      },
      // John Doe current semester grades (in progress)
      {
        studentId: student2Id,
        courseId: course1Id, // Principles of Programming Lang
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student2Id,
        courseId: course2Id, // Computer Architecture
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student2Id,
        courseId: course3Id, // Theory of Computation
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student2Id,
        courseId: course4Id, // Operating Systems
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student2Id,
        courseId: course9Id, // Data Mining
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student2Id,
        courseId: course10Id, // Intro to Psychology
        semester: currentSemester,
        status: 'in_progress',
      },
      // John Doe historical grades (Year 2 Semester 1)
      {
        studentId: student2Id,
        courseId: course7Id, // OOP - B
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'B',
        gpa: 8.0,
        status: 'completed',
      },
      {
        studentId: student2Id,
        courseId: course8Id, // Logic in CS - B+
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'B+',
        gpa: 8.0,
        status: 'completed',
      },
      // Shourya Tiwari current semester grades (in progress)
      {
        studentId: student3Id,
        courseId: course5Id, // Machine Learning
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student3Id,
        courseId: course2Id, // Computer Architecture
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student3Id,
        courseId: course1Id, // Principles of Programming Lang
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student3Id,
        courseId: course3Id, // Theory of Computation
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student3Id,
        courseId: course4Id, // Operating Systems
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student3Id,
        courseId: course6Id, // Modern Political Concepts
        semester: currentSemester,
        status: 'in_progress',
      },
      // Shourya Tiwari historical grades (Year 2 Semester 1)
      {
        studentId: student3Id,
        courseId: course7Id, // OOP - B-
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'B-',
        gpa: 7.0,
        status: 'completed',
      },
      {
        studentId: student3Id,
        courseId: course8Id, // Logic in CS - B
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'B',
        gpa: 8.0,
        status: 'completed',
      },
      // Rohan Gupta current semester grades (in progress)
      {
        studentId: student4Id,
        courseId: course9Id, // Data Mining
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student4Id,
        courseId: course2Id, // Computer Architecture
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student4Id,
        courseId: course1Id, // Principles of Programming Lang
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student4Id,
        courseId: course3Id, // Theory of Computation
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student4Id,
        courseId: course4Id, // Operating Systems
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student4Id,
        courseId: course10Id, // Intro to Psychology
        semester: currentSemester,
        status: 'in_progress',
      },
      // Rohan Gupta historical grades (Year 2 Semester 1 - Dean's List)
      {
        studentId: student4Id,
        courseId: course7Id, // OOP - A
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'A',
        gpa: 10.0,
        status: 'completed',
      },
      {
        studentId: student4Id,
        courseId: course8Id, // Logic in CS - A-
        semester: 'FIRST SEMESTER 2024-2025',
        finalGrade: 'A-',
        gpa: 9.0,
        status: 'completed',
      },
    ]);

    // Create Payments
    await db.collection('payments').insertMany([
      // Ansh Bandi payments (0.00 AED outstanding - cleared)
      {
        studentId: student1Id,
        semester: currentSemester,
        amount: 28000,
        status: 'paid',
        dueDate: new Date('2025-08-15'),
        paidDate: new Date('2025-08-10'),
        paymentMethod: 'Online Transfer',
        transactionId: 'TXN202508100169',
        description: 'Tuition and Hostel Fees - First Semester 2025-2026 (Cleared)',
      },
      // John Doe payments (5,000 AED outstanding - Library Fee pending)
      {
        studentId: student2Id,
        semester: currentSemester,
        amount: 25000,
        status: 'paid',
        dueDate: new Date('2025-08-15'),
        paidDate: new Date('2025-08-12'),
        paymentMethod: 'Online Transfer',
        transactionId: 'TXN202508120170',
        description: 'Tuition Fee - First Semester 2025-2026',
      },
      {
        studentId: student2Id,
        semester: currentSemester,
        amount: 5000,
        status: 'pending',
        dueDate: new Date('2025-12-01'),
        description: 'Library Fee',
      },
      // Shourya Tiwari payments (0.00 AED outstanding - cleared)
      {
        studentId: student3Id,
        semester: currentSemester,
        amount: 0,
        status: 'paid',
        dueDate: new Date('2025-08-15'),
        paidDate: new Date('2025-08-05'),
        paymentMethod: 'Online Transfer',
        transactionId: 'TXN202508050404',
        description: 'Tuition Fee - First Semester 2025-2026 (Cleared)',
      },
      // Rohan Gupta payments (0.00 AED outstanding - cleared, last payment 24,500 AED)
      {
        studentId: student4Id,
        semester: currentSemester,
        amount: 24500,
        status: 'paid',
        dueDate: new Date('2025-08-15'),
        paidDate: new Date('2025-08-10'),
        paymentMethod: 'Online Transfer',
        transactionId: 'TXN202508100567',
        description: 'Tuition and Hostel Fees - First Semester 2025-2026 (Cleared)',
      },
    ]);

    // Create Course Schedules
    await db.collection('course_schedules').insertMany([
      {
        courseId: course1Id,
        dayOfWeek: 'Wednesday',
        startTime: '14:50',
        endTime: '15:40',
        room: 'TBA',
        semester: currentSemester,
        type: 'lecture',
      },
      {
        courseId: course2Id,
        dayOfWeek: 'Friday',
        startTime: '10:15',
        endTime: '11:05',
        room: 'TBA',
        semester: currentSemester,
        type: 'lecture',
      },
      {
        courseId: course2Id,
        dayOfWeek: 'Wednesday',
        startTime: '09:20',
        endTime: '10:10',
        room: 'TBA',
        semester: currentSemester,
        type: 'lab',
      },
      {
        courseId: course3Id,
        dayOfWeek: 'Thursday',
        startTime: '10:15',
        endTime: '11:05',
        room: 'TBA',
        semester: currentSemester,
        type: 'lecture',
      },
      {
        courseId: course4Id,
        dayOfWeek: 'Tuesday',
        startTime: '09:20',
        endTime: '11:05',
        room: 'TBA',
        semester: currentSemester,
        type: 'lecture',
      },
      {
        courseId: course5Id,
        dayOfWeek: 'Wednesday',
        startTime: '13:55',
        endTime: '14:45',
        room: 'TBA',
        semester: currentSemester,
        type: 'lecture',
      },
      {
        courseId: course6Id,
        dayOfWeek: 'Wednesday',
        startTime: '12:05',
        endTime: '12:55',
        room: 'TBA',
        semester: currentSemester,
        type: 'lecture',
      },
    ]);

    // Create Academic Calendar
    await db.collection('academic_calendars').insertMany([
      {
        semester: currentSemester,
        eventType: 'registration',
        title: 'Course Registration Opens',
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-15'),
        description: 'Open enrollment period for courses',
        isActive: true,
      },
      {
        semester: currentSemester,
        eventType: 'midsem',
        title: 'Mid-Semester Examinations',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-25'),
        description: 'Mid-semester examination period',
        isActive: true,
      },
      {
        semester: currentSemester,
        eventType: 'endsem',
        title: 'End-Semester Examinations',
        startDate: new Date('2025-12-10'),
        endDate: new Date('2025-12-20'),
        description: 'End-semester examination period',
        isActive: true,
      },
      {
        semester: currentSemester,
        eventType: 'deadline',
        title: 'Assignment Submission Deadline',
        startDate: new Date('2025-10-12'),
        description: 'Last date for assignment submissions',
        isActive: true,
      },
    ]);

    // Create Attendance records
    const attendanceRecords = [];

    // Ansh Bandi attendance (avg 82.3%)
    const anshCourses = [
      { id: course2Id, attended: 46, total: 54 }, // Computer Architecture L4 - 85.2%
      { id: course5Id, attended: 32, total: 38 }, // Machine Learning L1 - 84.2%
      { id: course6Id, attended: 30, total: 39 }, // Modern Political Concepts - 76.9%
      { id: course4Id, attended: 47, total: 57 }, // Operating Systems L4 - 82.5%
      { id: course1Id, attended: 24, total: 28 }, // Principles of Prog Lang - 85.7%
      { id: course3Id, attended: 41, total: 52 }, // Theory of Computation - 78.8%
    ];

    for (const course of anshCourses) {
      for (let i = 0; i < course.total; i++) {
        const date = new Date(2025, 8 + Math.floor(i / 20), 1 + (i % 28));
        const status = i < course.attended ? 'present' : 'absent';
        attendanceRecords.push({
          studentId: student1Id,
          courseId: course.id,
          date,
          startTime: new Date(date.setHours(9, 0, 0)),
          endTime: new Date(date.setHours(10, 0, 0)),
          status,
          points: status === 'present' ? 1 : 0,
          remarks: status === 'present' ? 'Present' : 'Absent',
        });
      }
    }

    // John Doe attendance (avg 75.8%)
    const johnCourses = [
      { id: course2Id, attended: 40, total: 54 }, // Computer Architecture L4 - 74.1%
      { id: course9Id, attended: 30, total: 40 }, // Data Mining L1 - 75%
      { id: course10Id, attended: 27, total: 35 }, // Intro to Psychology L1 - 77.1%
      { id: course4Id, attended: 43, total: 57 }, // Operating Systems L4 - 75.4%
      { id: course1Id, attended: 22, total: 28 }, // Principles of Prog Lang - 78.6%
      { id: course3Id, attended: 39, total: 52 }, // Theory of Computation - 75%
    ];

    for (const course of johnCourses) {
      for (let i = 0; i < course.total; i++) {
        const date = new Date(2025, 8 + Math.floor(i / 20), 1 + (i % 28));
        const status = i < course.attended ? 'present' : 'absent';
        attendanceRecords.push({
          studentId: student2Id,
          courseId: course.id,
          date,
          startTime: new Date(date.setHours(9, 0, 0)),
          endTime: new Date(date.setHours(10, 0, 0)),
          status,
          points: status === 'present' ? 1 : 0,
          remarks: status === 'present' ? 'Present' : 'Absent',
        });
      }
    }

    // Shourya Tiwari attendance (avg 69.6%)
    const shouryaCourses = [
      { id: course2Id, attended: 34, total: 54 }, // Computer Architecture L4 - 63%
      { id: course5Id, attended: 26, total: 38 }, // Machine Learning L1 - 68.4%
      { id: course6Id, attended: 24, total: 39 }, // Modern Political Concepts - 61.5%
      { id: course4Id, attended: 35, total: 57 }, // Operating Systems L4 - 61.4%
      { id: course1Id, attended: 19, total: 28 }, // Principles of Prog Lang - 67.9%
      { id: course3Id, attended: 39, total: 52 }, // Theory of Computation - 75%
    ];

    for (const course of shouryaCourses) {
      for (let i = 0; i < course.total; i++) {
        const date = new Date(2025, 8 + Math.floor(i / 20), 1 + (i % 28));
        const status = i < course.attended ? 'present' : 'absent';
        attendanceRecords.push({
          studentId: student3Id,
          courseId: course.id,
          date,
          startTime: new Date(date.setHours(9, 0, 0)),
          endTime: new Date(date.setHours(10, 0, 0)),
          status,
          points: status === 'present' ? 1 : 0,
          remarks: status === 'present' ? 'Present' : 'Absent',
        });
      }
    }

    // Rohan Gupta attendance (avg 88.5%)
    const rohanCourses = [
      { id: course2Id, attended: 48, total: 54 }, // Computer Architecture L4 - 88.9%
      { id: course9Id, attended: 36, total: 40 }, // Data Mining L1 - 90%
      { id: course10Id, attended: 28, total: 35 }, // Intro to Psychology L1 - 80%
      { id: course4Id, attended: 50, total: 57 }, // Operating Systems L4 - 87.7%
      { id: course1Id, attended: 26, total: 28 }, // Principles of Prog Lang - 92.8%
      { id: course3Id, attended: 47, total: 52 }, // Theory of Computation - 90.4%
    ];

    for (const course of rohanCourses) {
      for (let i = 0; i < course.total; i++) {
        const date = new Date(2025, 8 + Math.floor(i / 20), 1 + (i % 28));
        const status = i < course.attended ? 'present' : 'absent';
        attendanceRecords.push({
          studentId: student4Id,
          courseId: course.id,
          date,
          startTime: new Date(date.setHours(9, 0, 0)),
          endTime: new Date(date.setHours(10, 0, 0)),
          status,
          points: status === 'present' ? 1 : 0,
          remarks: status === 'present' ? 'Present' : 'Absent',
        });
      }
    }

    await db.collection('attendances').insertMany(attendanceRecords);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
  }
}
