const ME_INSTITUTE_ELECTIVES = [
  { value: "ACH1581IECS", label: "ACH1581IECS - Chemistry for Engineers" },
  { value: "APH1581IECS", label: "APH1581IECS - Nanotechnology and its Applications" },
  { value: "APH1582IECS", label: "APH1582IECS - Space Technology" },
  { value: "CSE1582IECS", label: "CSE1582IECS - Python Programming" },
  { value: "WRE1581IECS", label: "WRE1581IECS - Water Conservation Concepts" },
  { value: "ACH1582IECS", label: "ACH1582IECS - Chemistry for Materials" },
];

const ME_DEPARTMENT_ELECTIVES = [
  { value: "MEC1551DECS", label: "MEC1551DECS - Hydraulic and Pneumatic Systems" },
  { value: "MEC1552DECS", label: "MEC1552DECS - Computational Fluid Dynamics" },
  { value: "MEC1553DECS", label: "MEC1553DECS - Industrial Management and Engineering Economics" },
  { value: "MEC1554DECS", label: "MEC1554DECS - Automobile Systems" },
];

const ME_BE4_SEM1_ELECTIVE_2 = [
  { value: "MEC1705DECS", label: "MEC1705DECS - Automobile Mechanisms" },
  { value: "MEC1706DECS", label: "MEC1706DECS - Fundamental of Aeronautics" },
  { value: "MEC1707DECS", label: "MEC1707DECS - AI and ML for Mechanical Engineers" },
  { value: "MEC1708DECS", label: "MEC1708DECS - Aircraft Propulsion" },
  { value: "MEC1709DECS", label: "MEC1709DECS - IC Engine Design and Performances" },
  { value: "MEC1710DECS", label: "MEC1710DECS - Maintenance Engineering & Management" },
  { value: "MEC1711DECS", label: "MEC1711DECS - Sustainable Energy Sources and Conversion Technologies" },
  { value: "MEC1712DECS", label: "MEC1712DECS - Product Design and Development" },
];

const ME_BE4_SEM2_ELECTIVE_3 = [
  { value: "MEC1803DECS", label: "MEC1803DECS - Advanced and Green Air Conditioning Technology" },
  { value: "MEC1804DECS", label: "MEC1804DECS - PLM Fundamentals" },
  { value: "MEC1805DECS", label: "MEC1805DECS - Thermal Power and Propulsion Systems" },
  { value: "MEC1806DECS", label: "MEC1806DECS - Computational Fluid Dynamics Modelling" },
  { value: "MEC1807DECS", label: "MEC1807DECS - Aircraft Design" },
  { value: "MEC1808DECS", label: "MEC1808DECS - Fundamentals of Combustion" },
];

const ME_BE4_SEM2_ELECTIVE_4 = [
  { value: "MEC1809DECS", label: "MEC1809DECS - Advanced and Green Refrigeration Technology" },
  { value: "MEC1810DECS", label: "MEC1810DECS - Digital Manufacturing" },
  { value: "MEC1811DECS", label: "MEC1811DECS - Modern Power Plant Systems and Load Management" },
  { value: "MEC1812DECS", label: "MEC1812DECS - Multiphase Flow Physics" },
  { value: "MEC1813DECS", label: "MEC1813DECS - Jet Propulsion Systems" },
  { value: "MEC1814DECS", label: "MEC1814DECS - Advanced Heat and Mass Transfer" },
];

function normalize(v) {
  return String(v || "").trim().toUpperCase();
}

function getCseElectiveSlot(subjectName) {
  // Accept variants like:
  // "Core Elective-II", "Core Elective II", "<Dept.Elective III>", "Department Elective 4"
  const compact = String(subjectName || "")
    .toUpperCase()
    .replace(/[<>]/g, " ")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact.includes("ELECTIVE")) return 0;

  const hasCseElectivePrefix =
    compact.includes("CORE ELECTIVE") ||
    compact.includes("DEP ELECTIVE") ||
    compact.includes("DEPT ELECTIVE") ||
    compact.includes("DEPARTMENT ELECTIVE");

  if (!hasCseElectivePrefix) return 0;

  const match = compact.match(/\b(IV|III|II|I|4|3|2|1)\b/);
  if (!match) return 0;

  const token = match[1];
  if (token === "I" || token === "1") return 1;
  if (token === "II" || token === "2") return 2;
  if (token === "III" || token === "3") return 3;
  if (token === "IV" || token === "4") return 4;
  return 0;
}

const CSE_CORE_ELECTIVE_1 = [
  { value: "CSE1703", label: "CSE1703 - AI - Artificial Intelligence" },
  { value: "CSE1704", label: "CSE1704 - LANP - Linux Administration & Network Programming" },
  { value: "CSE1705", label: "CSE1705 - SDS - Statistics in Data Science" },
];

const CSE_CORE_ELECTIVE_2 = [
  { value: "CSE1807", label: "CSE1807 - ML - Machine Learning" },
  { value: "CSE1707", label: "CSE1707 - DS - Distributed Systems" },
  { value: "CSE1708", label: "CSE1708 - NS - Network Security" },
];

const CSE_CORE_ELECTIVE_3 = [
  { value: "CSE1803", label: "CSE1803 - BDA - Big Data Analytics" },
  { value: "CSE1804", label: "CSE1804 - CC - Cloud Computing" },
  { value: "CSE1805", label: "CSE1805 - RTS - Real Time Systems" },
];

const CSE_CORE_ELECTIVE_4 = [
  { value: "CSE1701", label: "CSE1701 - MAI - Microprocessor Architecture & Interfacing" },
  { value: "CSE1809", label: "CSE1809 - IoT - Internet of Things" },
  { value: "CSE1806", label: "CSE1806 - CV - Computer Vision" },
];

const CSE_BE3_SEM2_MINOR_ELECTIVE_1 = [
  { value: "CSE1605", label: "CSE1605 - .NET Technologies" },
  { value: "CSE1606", label: "CSE1606 - Advance Java Technologies" },
];

const CSE_BE3_SEM2_INSTITUTE_ELECTIVE_1 = [
  { value: "AMT1682IECS", label: "AMT1682IECS - Advance statistical Software" },
  { value: "ELE1682IECS", label: "ELE1682IECS - Wireless communications and Networking" },
  { value: "ARC1681IECS", label: "ARC1681IECS - Fundamentals of Sustainable Building Design" },
  { value: "ARC1682IECS", label: "ARC1682IECS - Innovative Product Design and Development" },
  { value: "TXC1681IECS", label: "TXC1681IECS - Natural Resources for Textiles" },
  { value: "APH1681IECS", label: "APH1681IECS - Nanotechnology and its Applications" },
  { value: "WRE1681IECS", label: "WRE1681IECS - Water Conservation Concepts" },
  { value: "APH1682IECS", label: "APH1682IECS - Space Technology" },
  { value: "CHL1682IECS", label: "CHL1682IECS - Plastic Waste Management" },
  { value: "MEC1682IECS", label: "MEC1682IECS - Robotics Engineering" },
];

export function getElectiveOptions(program, subject) {
  const programCode = normalize(program);
  // Extract subject name from various possible property names
  const rawSubjectName = 
    subject?.name || 
    subject?.subjectName || 
    subject?.SubjectName ||
    subject?.subject_name ||
    "";
  
  const subjectName = normalize(rawSubjectName);

  if (programCode === "BE-ME") {
    if (subjectName.includes("INST.ELECTIVE") || subjectName.includes("INST") && subjectName.includes("ELECTIVE")) {
      return ME_INSTITUTE_ELECTIVES;
    }

    if (subjectName.includes("DEP.ELECTIVE II") || (subjectName.includes("DEP") && subjectName.includes("ELECTIVE II"))) {
      return ME_BE4_SEM1_ELECTIVE_2;
    }

    if (subjectName.includes("DEP.ELECTIVE III") || (subjectName.includes("DEP") && subjectName.includes("ELECTIVE III"))) {
      return ME_BE4_SEM2_ELECTIVE_3;
    }

    if (subjectName.includes("DEP.ELECTIVE IV") || (subjectName.includes("DEP") && subjectName.includes("ELECTIVE IV"))) {
      return ME_BE4_SEM2_ELECTIVE_4;
    }

    if (subjectName.includes("DEP.ELECTIVE") || (subjectName.includes("DEP") && subjectName.includes("ELECTIVE"))) {
      return ME_DEPARTMENT_ELECTIVES;
    }
  }

  if (programCode === "BE-CSE") {
    const electiveSlot = getCseElectiveSlot(subjectName);

    if (electiveSlot === 4) {
      return CSE_CORE_ELECTIVE_4;
    }

    if (electiveSlot === 3) {
      return CSE_CORE_ELECTIVE_3;
    }

    if (electiveSlot === 2) {
      return CSE_CORE_ELECTIVE_2;
    }

    if (electiveSlot === 1) {
      return CSE_CORE_ELECTIVE_1;
    }
    
    // Handle institute and minor electives for CSE
    if (
      subjectName.includes("INST.ELECTIVE") ||
      subjectName.includes("INSTITUTE ELECTIVE") ||
      subjectName.includes("INSTITUTE.ELECTIVE")
    ) {
      return CSE_BE3_SEM2_INSTITUTE_ELECTIVE_1;
    }
    
    if (
      subjectName.includes("MINOR ELECTIVE") ||
      subjectName.includes("PROGRAMMING ELECTIVE-I") ||
      subjectName.includes("PROGRAMMING ELECTIVE I") ||
      subjectName.includes("PROGRAMMING.ELECTIVE-I")
    ) {
      return CSE_BE3_SEM2_MINOR_ELECTIVE_1;
    }
  }

  return [];
}

export function isElectivePlaceholder(subject) {
  const name = String(
    subject?.name || 
    subject?.subjectName || 
    subject?.SubjectName || 
    subject?.subject_name || 
    ""
  ).trim();
  return /^<.*ELECTIVE.*>/i.test(name) || /ELECTIVE/i.test(name);
}
