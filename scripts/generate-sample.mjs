// Generates a realistic, deliberately messy sample results spreadsheet
// (Layout A: one row per student per course) for out-of-the-box testing.
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_PATH = fileURLToPath(new URL('../public/sample-data/sample-results.xlsx', import.meta.url));

const GRADE_SCALE = [
  { grade: 'A', min: 85, max: 100, points: 4.0 },
  { grade: 'A-', min: 80, max: 84, points: 3.66 },
  { grade: 'B+', min: 75, max: 79, points: 3.33 },
  { grade: 'B', min: 71, max: 74, points: 3.0 },
  { grade: 'B-', min: 68, max: 70, points: 2.66 },
  { grade: 'C+', min: 64, max: 67, points: 2.33 },
  { grade: 'C', min: 61, max: 63, points: 2.0 },
  { grade: 'C-', min: 58, max: 60, points: 1.66 },
  { grade: 'D+', min: 54, max: 57, points: 1.33 },
  { grade: 'D', min: 50, max: 53, points: 1.0 },
  { grade: 'F', min: 30, max: 49, points: 0.0 },
];

function gradeForMarks(marks) {
  return GRADE_SCALE.find((g) => marks >= g.min && marks <= g.max) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
}

let seed = 42;
function rand() {
  // Deterministic PRNG so the sample file is stable across regenerations.
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const PROGRAMS = {
  'BS(CS)': {
    sections: ['CS-A', 'CS-B'],
    courses: [
      ['CS101', 'Introduction to Programming', 3],
      ['CS102', 'Discrete Structures', 3],
      ['MATH101', 'Calculus I', 3],
      ['ENG101', 'English Composition', 3],
      ['CS201', 'Data Structures', 3],
      ['CS202', 'Digital Logic Design', 3],
      ['STAT201', 'Probability & Statistics', 3],
      ['CS301', 'Database Systems', 3],
      ['CS302', 'Operating Systems', 3],
      ['CS303', 'Software Engineering', 3],
    ],
    instructors: ['Dr. Amina Sheikh', 'Mr. Bilal Raza', 'Dr. Farah Iqbal', 'Ms. Hina Tariq'],
  },
  BBA: {
    sections: ['BBA-A', 'BBA-B'],
    courses: [
      ['BBA101', 'Principles of Management', 3],
      ['ECO101', 'Microeconomics', 3],
      ['ACC101', 'Financial Accounting', 3],
      ['ENG101', 'English Composition', 3],
      ['MGT201', 'Organizational Behavior', 3],
      ['MKT201', 'Principles of Marketing', 3],
      ['STAT201', 'Business Statistics', 3],
      ['FIN301', 'Corporate Finance', 3],
      ['HRM301', 'Human Resource Management', 3],
      ['BBA302', 'Business Communication', 3],
    ],
    instructors: ['Mr. Usman Khalid', 'Dr. Sana Malik', 'Ms. Ayesha Noor', 'Mr. Kamran Aziz'],
  },
};

const SEMESTERS = ['2023-FA', '2024-SP', '2024-FA'];

const FIRST_NAMES = [
  'Ahmed', 'Ali', 'Sara', 'Ayesha', 'Zainab', 'Hassan', 'Bilal', 'Fatima', 'Usman', 'Hira',
  'Omar', 'Mariam', 'Talha', 'Noor', 'Hamza', 'Iqra', 'Saad', 'Rabia', 'Faisal', 'Sana',
  'Danish', 'Amna', 'Waleed', 'Mehak', 'Junaid', 'Areeba', 'Zeeshan', 'Komal', 'Adeel', 'Nida',
];
const LAST_NAMES = [
  'Khan', 'Ahmed', 'Malik', 'Raza', 'Iqbal', 'Sheikh', 'Butt', 'Chaudhry', 'Qureshi', 'Siddiqui',
];

function studentName(i) {
  return `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i % LAST_NAMES.length]}`;
}

const rows = [];
let regCounter = 1001;

// Student 1 in BS(CS) is the deliberately declining-trend student.
// Students 5 and 22 get genuine F grades in different terms.
const DECLINING_STUDENT_INDEX = 0;
const FAILING_STUDENT_INDICES = [5, 12, 22, 27];

let studentIndex = 0;
for (const [programName, config] of Object.entries(PROGRAMS)) {
  for (let s = 0; s < 15; s++) {
    const regNo = `FA21-${programName === 'BS(CS)' ? 'BCS' : 'BBA'}-${regCounter++}`;
    const name = studentName(studentIndex);
    const section = config.sections[s % config.sections.length];
    const isDeclining = programName === 'BS(CS)' && s === DECLINING_STUDENT_INDEX;
    const isFailing = FAILING_STUDENT_INDICES.includes(studentIndex);

    SEMESTERS.forEach((semester, semIdx) => {
      // Each student takes ~5 courses per semester (rotate through the course pool).
      const courseCount = 5;
      const startIdx = (semIdx * courseCount) % config.courses.length;
      const semesterCourses = [];
      for (let c = 0; c < courseCount; c++) {
        semesterCourses.push(config.courses[(startIdx + c) % config.courses.length]);
      }

      // Only fail this student in ONE specific course across the whole dataset
      // (a genuine, isolated failure rather than a chronic pattern).
      const failingCourseSlot = studentIndex % courseCount;
      const failingSemesterSlot = studentIndex % SEMESTERS.length;

      semesterCourses.forEach(([code, title, credits], ci) => {
        let marks;
        if (isDeclining) {
          // Trend: strong -> mediocre -> weak, semester over semester.
          const base = [88, 70, 55][semIdx];
          marks = Math.max(35, base + randInt(-4, 4));
        } else if (isFailing && ci === failingCourseSlot && semIdx === failingSemesterSlot) {
          // One genuine failure for this student, in one course, one term.
          marks = randInt(30, 47);
        } else {
          // General cohort: bell-ish distribution centered in the B range,
          // rarely dipping into D territory and almost never failing.
          const bell = (rand() + rand() + rand()) / 3; // ~triangular, mean 0.5
          marks = Math.min(98, Math.max(48, Math.round(76 + (bell - 0.5) * 44)));
        }

        const grade = gradeForMarks(marks);
        const instructor = pick(config.instructors);

        // Sprinkle a few incomplete/withdrawn entries.
        const isIncomplete = rand() < 0.012;
        const isWithdrawn = !isIncomplete && rand() < 0.01;

        rows.push({
          regNo,
          name,
          program: programName,
          section,
          semester,
          code,
          title,
          credits,
          instructor,
          marks: isIncomplete || isWithdrawn ? '' : marks,
          grade: isIncomplete ? 'I' : isWithdrawn ? 'W' : ci === 2 ? grade.grade.toLowerCase() : grade.grade,
        });
      });
    });

    studentIndex++;
  }
}

// Build the messy grid: title row, header row, data rows, trailing notes.
const header = [
  'Reg No', 'Student Name', 'Program', 'Class/Section', 'Semester',
  'Course Code', 'Course Title', 'Cr Hrs', 'Instructor', 'Marks (%)', 'Grade',
];

const grid = [
  ['Examination Section — Consolidated Result Sheet (Fall 2023 – Fall 2024)'],
  [],
  header,
  ...rows.map((r) => [
    r.regNo, r.name, r.program, r.section, r.semester,
    r.code, r.title, r.credits, r.instructor, r.marks, r.grade,
  ]),
  [],
  ['Report generated by Examination Section — for internal review purposes only'],
  [`Total students: ${studentIndex}`],
];

const ws = XLSX.utils.aoa_to_sheet(grid);
ws['!cols'] = [
  { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
  { wch: 10 }, { wch: 26 }, { wch: 7 }, { wch: 18 }, { wch: 10 }, { wch: 7 },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Results');

mkdirSync(dirname(OUT_PATH), { recursive: true });
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync(OUT_PATH, buf);

console.log(`Wrote ${rows.length} course rows for ${studentIndex} students to ${OUT_PATH}`);
