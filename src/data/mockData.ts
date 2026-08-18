export interface CourseOption {
  id: string;
  faculty: string;
  programType: 'B.Tech' | 'HND';
  level: 'Level 100' | 'Level 200' | 'Level 300' | 'Level 400';
  courseCode: string;
  courseName: string;
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  isOpen: boolean;
  qrToken: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AttendanceRecord {
  courseId: string;
  fullName: string;
  indexNumber: string;
  programType: string;
  sessionType: string;
  level: string;
  programOfStudy: string;
  courseName: string;
  timestamp: string;
}

export const FACULTIES = [
  'Faculty of Computer Science & Informatics',
  'Faculty of Engineering',
  'Faculty of Business & Management Studies',
  'Faculty of Applied Sciences & Technology',
  'Faculty of Built & Natural Environment'
];

export const PROGRAM_OPTIONS = [
  'B.Tech Information Technology',
  'B.Tech Computer Science',
  'B.Tech Civil Engineering',
  'B.Tech Accounting with Computing',
  'HND Computer Science',
  'HND Information Technology',
  'HND Accountancy'
];

export const SESSION_OPTIONS = [
  'Regular Session',
  'Evening Session',
  'Weekend Session'
];

export const AVAILABLE_COURSES: CourseOption[] = [
  { id: 'kstu-cos-402', faculty: 'Faculty of Computer Science & Informatics', programType: 'B.Tech', level: 'Level 400', courseCode: 'COS 402', courseName: 'Systems Analysis and Design' },
  { id: 'kstu-cos-401', faculty: 'Faculty of Computer Science & Informatics', programType: 'B.Tech', level: 'Level 400', courseCode: 'COS 401', courseName: 'Artificial Intelligence & Expert Systems' },
  { id: 'kstu-cos-301', faculty: 'Faculty of Computer Science & Informatics', programType: 'B.Tech', level: 'Level 300', courseCode: 'COS 301', courseName: 'Database Management Systems' },
  { id: 'kstu-cos-302', faculty: 'Faculty of Computer Science & Informatics', programType: 'B.Tech', level: 'Level 300', courseCode: 'COS 302', courseName: 'Web Application Development' },
  { id: 'kstu-cos-201', faculty: 'Faculty of Computer Science & Informatics', programType: 'HND', level: 'Level 200', courseCode: 'CSC 201', courseName: 'Data Structures and Algorithms' },
  { id: 'kstu-cos-101', faculty: 'Faculty of Computer Science & Informatics', programType: 'HND', level: 'Level 100', courseCode: 'CSC 101', courseName: 'Introduction to Computer Hardware' },
  { id: 'kstu-eng-301', faculty: 'Faculty of Engineering', programType: 'B.Tech', level: 'Level 300', courseCode: 'ENG 301', courseName: 'Advanced Engineering Mathematics' },
  { id: 'kstu-eng-201', faculty: 'Faculty of Engineering', programType: 'HND', level: 'Level 200', courseCode: 'CVE 201', courseName: 'Strength of Materials' },
  { id: 'kstu-bus-201', faculty: 'Faculty of Business & Management Studies', programType: 'HND', level: 'Level 200', courseCode: 'ACC 201', courseName: 'Financial Accounting II' },
  { id: 'kstu-bus-401', faculty: 'Faculty of Business & Management Studies', programType: 'B.Tech', level: 'Level 400', courseCode: 'MGT 401', courseName: 'Strategic Management' },
  { id: 'kstu-app-101', faculty: 'Faculty of Applied Sciences & Technology', programType: 'HND', level: 'Level 100', courseCode: 'STA 101', courseName: 'Business Statistics' }
];