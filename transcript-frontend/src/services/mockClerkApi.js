import axios from "axios";

const client = axios.create();

function mockAdapter(data, delayMs = 700) {
  return async (config) => {
    await new Promise((r) => setTimeout(r, delayMs));
    return {
      data,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      request: {},
    };
  };
}

export async function fetchClerkDashboard() {
  const data = {
    stats: {
      pendingVerifications: 18,
      pendingGradeEntry: 9,
      forwardedToHod: 7,
      rejectedRequests: 3,
    },
    workload7d: [
      { day: "Mon", value: 6 },
      { day: "Tue", value: 9 },
      { day: "Wed", value: 4 },
      { day: "Thu", value: 8 },
      { day: "Fri", value: 11 },
      { day: "Sat", value: 5 },
      { day: "Sun", value: 3 },
    ],
    activities: [
      { id: "A1", text: "Verified student PRN 8022053249", time: "10 min ago" },
      { id: "A2", text: "Forwarded request TR-019 to HoD", time: "45 min ago" },
      { id: "A3", text: "Edited grades for PRN 8022053111", time: "2 hrs ago" },
      { id: "A4", text: "Received rejection from HoD (TR-014)", time: "Yesterday" },
    ],
  };

  return client.get("/mock/clerk/dashboard", { adapter: mockAdapter(data) }).then((r) => r.data);
}

export async function fetchVerificationStudents(query = "") {
  const students = [
    {
      id: "S1",
      name: "David Bernardo",
      prn: "8022053249",
      program: "BE-CSE",
      photo: null,
      status: "Pending",
      personal: {
        email: "david.bernardo@example.com",
        mobile: "+91 9876543210",
        dob: "2000-08-15",
        nationality: "India",
        address: "Baroda, Gujarat, India",
      },
      academic: {
        faculty: "Technology and Engineering",
        department: "Computer Science and Engineering",
        admissionYear: "2022",
        graduationYear: "2026",
      },
      documents: {
        marksheetUrl: "/",
        govtIdUrl: "/",
        authorityLetterUrl: "/",
      },
    },
    {
      id: "S2",
      name: "Riya Patel",
      prn: "8022053111",
      program: "MCA",
      photo: null,
      status: "Verified",
      personal: {
        email: "riya.patel@example.com",
        mobile: "+91 9123456780",
        dob: "2001-05-03",
        nationality: "India",
        address: "Vadodara, Gujarat, India",
      },
      academic: {
        faculty: "Technology and Engineering",
        department: "Computer Science and Engineering",
        admissionYear: "2023",
        graduationYear: "2025",
      },
      documents: {
        marksheetUrl: "/",
        govtIdUrl: "/",
        authorityLetterUrl: "/",
      },
    },
    {
      id: "S3",
      name: "Aman Shah",
      prn: "8022053999",
      program: "BE-ME",
      photo: null,
      status: "Returned by HoD",
      personal: {
        email: "aman.shah@example.com",
        mobile: "+91 9988776655",
        dob: "2000-11-20",
        nationality: "India",
        address: "Baroda, Gujarat, India",
      },
      academic: {
        faculty: "Technology and Engineering",
        department: "Mechanical Engineering",
        admissionYear: "2022",
        graduationYear: "2026",
      },
      documents: {
        marksheetUrl: "/",
        govtIdUrl: "/",
        authorityLetterUrl: "/",
      },
    },
  ];

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? students
    : students.filter(
        (s) =>
          s.prn.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );

  return client
    .get("/mock/clerk/verification", { adapter: mockAdapter({ students: filtered }, 650) })
    .then((r) => r.data);
}

export async function fetchGradesByPrn(prn) {
  const data = {
    student: {
      name: "David Bernardo",
      prn,
      program: "BE-CSE",
    },
    semesters: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
    subjects: [
      { code: "CSE101", name: "Programming Fundamentals", thMax: 70, prMax: 30 },
      { code: "CSE102", name: "Data Structures", thMax: 70, prMax: 30 },
      { code: "CSE103", name: "Discrete Mathematics", thMax: 100, prMax: 0 },
      { code: "CSE104", name: "Computer Networks", thMax: 70, prMax: 30 },
      { code: "CSE105", name: "Database Systems", thMax: 70, prMax: 30 },
    ],
  };

  return client.get("/mock/clerk/grades", { adapter: mockAdapter(data, 700) }).then((r) => r.data);
}

export async function fetchTranscriptQueue() {
  const data = {
    requests: [
      {
        id: "TR-019",
        studentName: "David Bernardo",
        program: "BE-CSE",
        semesterStatus: "Sem1✓ Sem2✓ Sem3⏳ Sem4⏳",
        stage: "Clerk → HoD → Dean",
        status: "Verification Pending",
        remarks: "",
      },
      {
        id: "TR-014",
        studentName: "Aman Shah",
        program: "BE-ME",
        semesterStatus: "Sem1✓ Sem2✓ Sem3✓ Sem4✓",
        stage: "Clerk → HoD → Dean",
        status: "Returned by HoD",
        remarks: "Mismatch in Sem 3 practical marks.",
      },
      {
        id: "TR-010",
        studentName: "Riya Patel",
        program: "MCA",
        semesterStatus: "Sem1✓ Sem2✓ Sem3✓ Sem4✓",
        stage: "Clerk → HoD → Dean",
        status: "Forwarded to HoD",
        remarks: "",
      },
    ],
  };
  return client.get("/mock/clerk/queue", { adapter: mockAdapter(data, 650) }).then((r) => r.data);
}

export async function fetchReturnedRequests() {
  const data = {
    requests: [
      {
        id: "TR-014",
        studentName: "Aman Shah",
        returnedBy: "HoD",
        remarks: "Mismatch in Sem 3 practical marks.",
        date: "2024-01-12",
      },
      {
        id: "TR-008",
        studentName: "Kiran Desai",
        returnedBy: "Dean",
        remarks: "Missing authority letter.",
        date: "2024-01-07",
      },
    ],
  };
  return client.get("/mock/clerk/returned", { adapter: mockAdapter(data, 650) }).then((r) => r.data);
}

