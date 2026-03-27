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

export function getElectiveOptions(program, subject) {
  const programCode = normalize(program);
  const subjectName = normalize(subject?.name || subject?.subjectName || "");

  if (programCode !== "BE-ME") return [];

  if (subjectName.includes("INST.ELECTIVE")) {
    return ME_INSTITUTE_ELECTIVES;
  }

  if (subjectName.includes("DEP.ELECTIVE II")) {
    return ME_BE4_SEM1_ELECTIVE_2;
  }

  if (subjectName.includes("DEP.ELECTIVE III")) {
    return ME_BE4_SEM2_ELECTIVE_3;
  }

  if (subjectName.includes("DEP.ELECTIVE IV")) {
    return ME_BE4_SEM2_ELECTIVE_4;
  }

  if (subjectName.includes("DEP.ELECTIVE")) {
    return ME_DEPARTMENT_ELECTIVES;
  }

  return [];
}

export function isElectivePlaceholder(subject) {
  const name = String(subject?.name || subject?.subjectName || "").trim();
  return /^<.*ELECTIVE.*>/i.test(name) || /ELECTIVE/i.test(name);
}
