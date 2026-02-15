
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VerifiedBadge } from "@/components/verified-badge"
import { MapPin, Users, Calendar, Briefcase, Linkedin, GraduationCap, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { teacherProfile } from "@/lib/mock-data"

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage src={teacherProfile.avatarUrl} alt={teacherProfile.fullName} />
            <AvatarFallback>{teacherProfile.fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left flex-grow">
            <h1 className="text-4xl font-bold tracking-tight">{teacherProfile.fullName}</h1>
            {teacherProfile.isVerifiedTeacher && <VerifiedBadge className="mt-2 text-base px-3 py-1" />}
            <p className="text-muted-foreground mt-2">Member since {teacherProfile.memberSince.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
          </div>
          <Button variant="outline">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="flex items-start gap-4">
                  <Briefcase className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">Years of Experience</h3>
                    <p className="text-lg">{teacherProfile.yearsOfExperience} years</p>
                  </div>
                </div>
                 <div className="flex items-start gap-4">
                  <GraduationCap className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">Qualifications</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {teacherProfile.qualifications.map(q => <Badge key={q} variant="secondary" className="text-sm">{q}</Badge>)}
                    </div>
                  </div>
                </div>
                 <div className="flex items-start gap-4">
                  <Linkedin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">LinkedIn Profile</h3>
                    <a href={teacherProfile.linkedInProfileUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline text-lg">
                      View Profile
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Job Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">Preferred Regions</h3>
                     <div className="flex flex-wrap gap-2 mt-2">
                       {teacherProfile.preferredRegions.map(r => <Badge key={r} variant="outline" className="text-sm">{r}</Badge>)}
                    </div>
                  </div>
                </div>
                 <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-muted-foreground">Preferred Countries</h3>
                     <div className="flex flex-wrap gap-2 mt-2">
                       {teacherProfile.preferredCountries.map(c => <Badge key={c} variant="outline" className="text-sm">{c}</Badge>)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <p><span className="font-semibold text-muted-foreground">Family Status:</span> {teacherProfile.familyStatus}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <p><span className="font-semibold text-muted-foreground">Age Group:</span> {teacherProfile.ageGroup}</p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
