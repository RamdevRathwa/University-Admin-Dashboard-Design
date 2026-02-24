import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Separator } from "../../components/ui/separator";

export default function Profile() {
  const personalInfo = {
    "Full Name": "David Bernardo",
    Email: "david.bernardo@example.com",
    Mobile: "+91 9876543210",
    "Date of Birth": "15/08/2000",
    Nationality: "Indian",
    Address: "123 Main Street, Baroda, Gujarat, India",
  };

  const academicInfo = {
    PRN: "8022053249",
    Faculty: "Faculty of Technology and Engineering",
    Department: "Computer Science and Engineering",
    Program: "BE-CSE",
    "Admission Year": "2022",
    "Expected Graduation": "2026",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
          <p className="text-sm text-gray-500">Review your personal and academic information.</p>
        </div>
        <Button>Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-3xl">{String(personalInfo["Full Name"] || "S").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{personalInfo["Full Name"]}</CardTitle>
            <CardDescription>
              {academicInfo.Program} - {academicInfo.Department}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-medium text-gray-900">PRN:</span> {academicInfo.PRN}
              </p>
              <p>
                <span className="font-medium text-gray-900">Faculty:</span> {academicInfo.Faculty}
              </p>
              <p>
                <span className="font-medium text-gray-900">Batch:</span> {academicInfo["Admission Year"]} - {academicInfo["Expected Graduation"]}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Student identity and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(personalInfo).map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic Information</CardTitle>
              <CardDescription>Program and enrollment details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(academicInfo).map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
