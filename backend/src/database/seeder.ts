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
    await db.collection('attendances').deleteMany({}).catch(() => {});
    await db.collection('grades').deleteMany({}).catch(() => {});
    await db.collection('payments').deleteMany({}).catch(() => {});
    await db.collection('enrollments').deleteMany({}).catch(() => {});
    await db.collection('course_schedules').deleteMany({}).catch(() => {});
    await db.collection('academic_calendars').deleteMany({}).catch(() => {});
    await db.collection('courses').deleteMany({}).catch(() => {});
    await db.collection('students').deleteMany({}).catch(() => {});
    await db.collection('admins').deleteMany({}).catch(() => {});

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
    
    await db.collection('students').insertMany([
      {
        _id: student1Id,
        studentId: '2023A7PS0169U',
        name: 'ANSH BANDI',
        email: 'ansh.bandi@dubai.bits-pilani.ac.in',
        password: hashedPassword,
        program: 'Computer Science PS DUBAI',
        gpa: 8.15,
        cgpa: 8.15,
        status: 'active',
      },
      {
        _id: student2Id,
        studentId: '2023A7PS0170U',
        name: 'JOHN DOE',
        email: 'john.doe@dubai.bits-pilani.ac.in',
        password: hashedPassword,
        program: 'Computer Science PS DUBAI',
        gpa: 7.8,
        cgpa: 7.8,
        status: 'active',
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
    ]);

    const currentSemester = 'FIRST SEMESTER 2025-2026';
    const pastSemester = 'FIRST SEMESTER 2024-2025';

    // Create Enrollments
    await db.collection('enrollments').insertMany([
      {
        studentId: student1Id,
        courseId: course1Id,
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course2Id,
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course3Id,
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course4Id,
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course5Id,
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
      {
        studentId: student1Id,
        courseId: course6Id,
        semester: currentSemester,
        status: 'enrolled',
        enrolledAt: new Date(),
      },
    ]);

    // Create Grades
    await db.collection('grades').insertMany([
      {
        studentId: student1Id,
        courseId: course1Id,
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course2Id,
        semester: currentSemester,
        status: 'in_progress',
      },
      {
        studentId: student1Id,
        courseId: course7Id,
        semester: pastSemester,
        midSemMarks: 75,
        midSemGrade: 'C',
        finalMarks: 78,
        finalGrade: 'C',
        totalMarks: 76.5,
        gpa: 6.0,
        status: 'completed',
      },
      {
        studentId: student1Id,
        courseId: course8Id,
        semester: pastSemester,
        midSemMarks: 85,
        midSemGrade: 'B',
        finalMarks: 88,
        finalGrade: 'B',
        totalMarks: 86.5,
        gpa: 8.0,
        status: 'completed',
      },
    ]);

    // Create Payments
    await db.collection('payments').insertMany([
      {
        studentId: student1Id,
        semester: currentSemester,
        amount: 150000,
        status: 'paid',
        dueDate: new Date('2025-08-15'),
        paidDate: new Date('2025-08-10'),
        paymentMethod: 'Online Transfer',
        transactionId: 'TXN202508101234',
        description: 'Tuition Fee - First Semester 2025-2026',
      },
      {
        studentId: student1Id,
        semester: currentSemester,
        amount: 5000,
        status: 'pending',
        dueDate: new Date('2025-12-01'),
        description: 'Library Fee',
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
    const courseIds = [course1Id, course2Id, course5Id];
    const dates = [
      new Date('2025-11-05T14:50:00'),
      new Date('2025-11-07T11:00:00'),
      new Date('2025-11-12T14:50:00'),
      new Date('2025-11-14T11:00:00'),
    ];

    for (const courseId of courseIds) {
      for (const date of dates) {
        const statuses = ['present', 'absent', 'present'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        attendanceRecords.push({
          studentId: student1Id,
          courseId,
          date,
          startTime: new Date(date),
          endTime: new Date(date.getTime() + 50 * 60000), // 50 minutes later
          status,
          points: status === 'present' ? 1 : 0,
          remarks: status === 'present' ? 'Self-recorded' : 'auto record by system',
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
