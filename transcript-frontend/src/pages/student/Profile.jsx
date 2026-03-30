import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Separator } from "../../components/ui/separator";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert } from "../../components/ui/alert";
import { apiRequest } from "../../services/apiClient";
import { studentProfileService } from "../../services/studentProfileService";
import PageHeader from "../../components/shell/PageHeader";

function formatDob(dobValue) {
  const raw = String(dobValue || "").trim();
  if (!raw) return "-";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return raw;
  const dt = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([apiRequest("/api/Auth/me"), studentProfileService.get()])
      .then(([meRes, profRes]) => {
        if (!alive) return;
        setMe(meRes || null);
        setProfile(profRes || null);
      })
      .catch((e) => alive && setError(e?.message || "Failed to load profile."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const personalInfo = useMemo(() => {
    return {
      "Full Name": me?.fullName || "-",
      Email: me?.email || "-",
      Mobile: me?.mobile || "-",
      Nationality: profile?.nationality || "-",
      "Date of Birth": formatDob(profile?.dob),
      "Birth Place": profile?.birthPlace || "-",
      Address: profile?.address || "-",
    };
  }, [me, profile]);

  const academicInfo = useMemo(() => {
    return {
      PRN: profile?.prn || "-",
      Faculty: profile?.faculty || "-",
      Department: profile?.department || "-",
      Program: profile?.program || "-",
      "Admission Year": profile?.admissionYear ?? "-",
      "Graduation Year": profile?.graduationYear ?? "-",
    };
  }, [profile]);

  const displayName = me?.fullName || "Student";
  const avatarLetter = String(displayName).trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="space-y-6">
      <PageHeader title="Student Profile" description="Your personal and academic information." />

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-3xl">{avatarLetter}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4">{loading ? <Skeleton className="h-6 w-48" /> : displayName}</CardTitle>
            <CardDescription>{loading ? <Skeleton className="h-4 w-56" /> : `${academicInfo.Program} - ${academicInfo.Department}`}</CardDescription>
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
                <span className="font-medium text-gray-900">Batch:</span> {academicInfo["Admission Year"]} - {academicInfo["Graduation Year"]}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
              <CardDescription>Identity and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(personalInfo).map(([label, value]) => (
                    <div key={label} className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic Information</CardTitle>
              <CardDescription>Program and enrollment details.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {Object.entries(academicInfo).map(([label, value]) => (
                    <div key={label} className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-medium text-gray-900 break-words">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

