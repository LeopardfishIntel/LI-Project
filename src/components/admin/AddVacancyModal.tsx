"use client";

import React, { useState, useMemo } from 'react';
import { 
  X, Building2, MapPin, Calendar, Link as LinkIcon, PlusCircle, CheckCircle2, 
  AlertCircle, Sparkles, Loader2, Search, ArrowRight, Eye, ShieldCheck, DollarSign
} from 'lucide-react';
import { createAdminJobAction } from '@/app/actions/admin-job-actions';
import { getSavingsBadgeConfig } from '@/app/featured-jobs/page';
import { cn } from '@/lib/utils';

interface SchoolItem {
  id: string;
  schoolname?: string;
  name?: string;
  city?: string;
  country?: string;
  group?: string;
  ownership?: string;
  academicscore?: string | number;
  rating?: string | number;
  curriculum?: string;
  website?: string;
  schoolWebsite?: string;
}

interface AddVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: SchoolItem[];
  adminUserId?: string;
  onSuccess?: () => void;
}

const COMMON_DEPARTMENTS = [
  "Secondary",
  "Primary",
  "Early Years / Kindergarten",
  "Leadership / Administration",
  "Whole School"
];

const COMMON_SUBJECTS = [
  "Mathematics",
  "English Language & Literature",
  "Physics",
  "Chemistry",
  "Biology",
  "General Science",
  "History",
  "Geography",
  "Economics / Business Studies",
  "Computer Science / IT",
  "Visual Arts",
  "Music & Performing Arts",
  "Physical Education (PE)",
  "Modern Foreign Languages (MFL)",
  "Special Educational Needs (SEN)",
  "General Primary Homeroom",
  "Early Years Homeroom"
];

const COMMON_SOURCES = [
  { id: "DIRECT", label: "Direct School Portal" },
  { id: "COGNITA", label: "Cognita Schools" },
  { id: "NORD ANGLIA", label: "Nord Anglia Education" },
  { id: "TAALEEM", label: "Taaleem" },
  { id: "INSPIRED", label: "Inspired Education" },
  { id: "GLOBEDUCATE", label: "Globeducate" },
  { id: "ISP", label: "International Schools Partnership (ISP)" },
  { id: "GEMS", label: "GEMS Education" },
  { id: "TES", label: "TES (Times Educational Supplement)" },
  { id: "OTHER", label: "Other / Direct Website" }
];

export function AddVacancyModal({
  isOpen,
  onClose,
  schools = [],
  adminUserId = "admin",
  onSuccess
}: AddVacancyModalProps) {
  // Form State
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [schoolSearchQuery, setSchoolSearchQuery] = useState<string>("");
  const [isSchoolPickerOpen, setIsSchoolPickerOpen] = useState<boolean>(false);

  const [jobTitle, setJobTitle] = useState<string>("");
  const [department, setDepartment] = useState<string>("Secondary");
  const [subject, setSubject] = useState<string>("Mathematics");
  const [curriculum, setCurriculum] = useState<string>("IB Diploma Programme (DP)");
  const [source, setSource] = useState<string>("DIRECT");
  const [applyUrl, setApplyUrl] = useState<string>("");
  const [directUrl, setDirectUrl] = useState<string>("");
  const [closingDate, setClosingDate] = useState<string>("");
  const [isRollingDeadline, setIsRollingDeadline] = useState<boolean>(false);
  const [savingsOverride, setSavingsOverride] = useState<string>("2000");

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected School Data Object
  const selectedSchool = useMemo(() => {
    return schools.find(s => s.id === selectedSchoolId) || null;
  }, [schools, selectedSchoolId]);

  // Filtered Schools for Combobox
  const filteredSchools = useMemo(() => {
    if (!schoolSearchQuery.trim()) return schools.slice(0, 30);
    const q = schoolSearchQuery.toLowerCase();
    return schools.filter(s => {
      const name = (s.schoolname || s.name || "").toLowerCase();
      const city = (s.city || "").toLowerCase();
      const country = (s.country || "").toLowerCase();
      return name.includes(q) || city.includes(q) || country.includes(q) || s.id.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [schools, schoolSearchQuery]);

  // Handle selecting a school
  const handleSelectSchool = (school: SchoolItem) => {
    setSelectedSchoolId(school.id);
    setSchoolSearchQuery(school.schoolname || school.name || "");
    setIsSchoolPickerOpen(false);

    // Auto-populate curriculum if available
    if (school.curriculum && !curriculum) {
      setCurriculum(school.curriculum);
    }
  };

  // Submission handler
  const handleSubmit = async (publishStatus: 'approved' | 'pending_review') => {
    if (!selectedSchool) {
      setFeedbackMessage({ type: 'error', text: 'Please select a school from the registry.' });
      return;
    }
    if (!jobTitle.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Please enter a job title.' });
      return;
    }
    if (!applyUrl.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Please provide an application or careers URL.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const schoolRating = parseFloat(String(selectedSchool.academicscore || selectedSchool.rating || '8.0')) || 8.0;
      const numSavings = parseFloat(savingsOverride) || 1800;

      const result = await createAdminJobAction({
        schoolId: selectedSchool.id,
        schoolName: selectedSchool.schoolname || selectedSchool.name || "International School",
        city: selectedSchool.city || "Bangkok",
        country: selectedSchool.country || "Thailand",
        group: selectedSchool.group || selectedSchool.ownership || "",
        schoolRating: schoolRating,
        schoolWebsite: selectedSchool.schoolWebsite || selectedSchool.website || "",
        jobTitle: jobTitle.trim(),
        department: department,
        subject: subject,
        curriculum: curriculum,
        source: source,
        applyUrl: applyUrl.trim(),
        directUrl: directUrl.trim() || undefined,
        closingDate: isRollingDeadline ? null : closingDate || null,
        isRollingDeadline: isRollingDeadline,
        savingsOverride: numSavings,
        status: publishStatus,
        adminUserId: adminUserId,
      });

      if (result.success) {
        setFeedbackMessage({
          type: 'success',
          text: result.message || 'Vacancy recorded successfully!'
        });
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setFeedbackMessage({
          type: 'error',
          text: result.error || 'Failed to publish vacancy.'
        });
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentSavingsValue = parseFloat(savingsOverride) || 1800;
  const currentBadge = getSavingsBadgeConfig(currentSavingsValue);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b1224]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#FF6B35]/15 border border-[#FF6B35]/30 flex items-center justify-center text-[#FF6B35]">
              <PlusCircle className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Admin Vacancy Studio
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Direct Ingest
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Input school vacancy data, preview the live listing, and publish directly or queue for staging review.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns (Form + Live Preview) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. School Selector */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-[#38BDF8]" />
                Target School Registry Entity <span className="text-rose-400">*</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search school by name, city, or country..."
                  value={schoolSearchQuery}
                  onChange={(e) => {
                    setSchoolSearchQuery(e.target.value);
                    setIsSchoolPickerOpen(true);
                  }}
                  onFocus={() => setIsSchoolPickerOpen(true)}
                  className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF6B35] outline-none font-medium"
                />
                <Search className="absolute right-3 top-2.5 size-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Combobox dropdown */}
              {isSchoolPickerOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-56 bg-[#0b1224] border border-slate-700 rounded-md shadow-2xl overflow-y-auto z-50 divide-y divide-slate-800">
                  {filteredSchools.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No schools match search query.</div>
                  ) : (
                    filteredSchools.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectSchool(s)}
                        className="w-full text-left px-3 py-2 hover:bg-[#1e293b] transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-[#FF6B35]">{s.schoolname || s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.city}, {s.country} • ID: {s.id}</p>
                        </div>
                        {s.academicscore && (
                          <span className="text-[10px] bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                            ★ {s.academicscore}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedSchool && (
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-md text-[11px] flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-[#38BDF8] flex items-center gap-1">
                    <MapPin className="size-3" /> {selectedSchool.city}, {selectedSchool.country}
                  </span>
                  <span className="text-slate-500 font-mono">School ID: {selectedSchool.id}</span>
                </div>
              )}
            </div>

            {/* 2. Job Title */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                <label>Job Title <span className="text-rose-400">*</span></label>
                <span className="text-[10px] font-mono text-slate-500">{jobTitle.length}/60 chars</span>
              </div>
              <input
                type="text"
                maxLength={60}
                placeholder="e.g. DP Mathematics Teacher (with MYP)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF6B35] outline-none font-medium"
              />
            </div>

            {/* 3. Department & Subject Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-2.5 py-2 text-xs text-white focus:border-[#FF6B35] outline-none font-medium cursor-pointer"
                >
                  {COMMON_DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Subject / Specialism</label>
                <input
                  type="text"
                  list="subjects-list"
                  placeholder="e.g. Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF6B35] outline-none font-medium"
                />
                <datalist id="subjects-list">
                  {COMMON_SUBJECTS.map(sub => (
                    <option key={sub} value={sub} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* 4. Curriculum & Source Engine Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Curriculum Framework</label>
                <input
                  type="text"
                  placeholder="e.g. IB Diploma Programme (DP)"
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF6B35] outline-none font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Source Platform</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-2.5 py-2 text-xs text-white focus:border-[#FF6B35] outline-none font-medium cursor-pointer"
                >
                  {COMMON_SOURCES.map(src => (
                    <option key={src.id} value={src.id}>{src.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Application Link (Apply URL) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <LinkIcon className="size-3.5 text-emerald-400" />
                Application URL / Careers Page Link <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                placeholder="https://school-careers.com/vacancy/12345"
                value={applyUrl}
                onChange={(e) => setApplyUrl(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF6B35] outline-none font-medium"
              />
            </div>

            {/* 6. Closing Date & Rolling Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[#FF6B35]" />
                  Closing Deadline
                </label>
                <input
                  type="date"
                  disabled={isRollingDeadline}
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white disabled:opacity-40 focus:border-[#FF6B35] outline-none font-medium"
                />
              </div>

              <div className="pb-2">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={isRollingDeadline}
                    onChange={(e) => setIsRollingDeadline(e.target.checked)}
                    className="rounded border-slate-700 text-[#FF6B35] focus:ring-0 size-4 bg-slate-900"
                  />
                  <span>Rolling Deadline / Open until filled</span>
                </label>
              </div>
            </div>

            {/* 7. Estimated Monthly Net Savings Override */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <DollarSign className="size-3.5 text-emerald-400" />
                Estimated Single Teacher Net Monthly Surplus (£/mo)
              </label>
              <input
                type="number"
                step="50"
                placeholder="2000"
                value={savingsOverride}
                onChange={(e) => setSavingsOverride(e.target.value)}
                className="w-full bg-[#1e293b] border border-slate-700/80 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF6B35] outline-none font-medium font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Surplus tier: <span className="text-emerald-400 font-semibold">{currentBadge.label}</span> ({currentBadge.shortLabel})
              </p>
            </div>

          </div>

          {/* Right: Live Preview Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 border-t lg:border-t-0 lg:border-l border-slate-800 lg:pl-6 pt-4 lg:pt-0">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#38BDF8] mb-3 uppercase tracking-wider">
                <Eye className="size-3.5" />
                Live Opportunity Feed Preview
              </div>

              {/* Mock Feed Card */}
              <div className="bg-[#243147] border border-[#334155] p-4 rounded-md shadow-lg space-y-2.5 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#FF6B35]" />
                
                <div>
                  <h4 className="text-sm font-bold text-white leading-snug">
                    {jobTitle || "Job Title Preview"}
                  </h4>
                  <p className="text-xs font-semibold text-[#38BDF8] flex items-center gap-1 mt-0.5">
                    <Building2 className="size-3 shrink-0" />
                    {selectedSchool?.schoolname || selectedSchool?.name || "School Name Preview"}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 shrink-0" />
                    {selectedSchool ? `${selectedSchool.city}, ${selectedSchool.country}` : "City, Country"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-[#FF6B35]" />
                    {isRollingDeadline ? "Rolling Deadline" : (closingDate ? `Closes: ${closingDate}` : "Added Recently")}
                  </span>
                  <span className="font-mono text-slate-500">REF: ADMIN-MOCK</span>
                </div>

                {/* Bottom Badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
                  <span className="h-6 px-2 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    {source} ↗
                  </span>
                  <span className={cn("h-6 px-2 text-[10px] font-bold rounded flex items-center gap-1", currentBadge.boxStyle)}>
                    {currentBadge.label}
                  </span>
                  <span className="h-6 px-2 text-[10px] font-black uppercase tracking-wider rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    NEW
                  </span>
                </div>
              </div>

              {/* Guidance Box */}
              <div className="mt-4 p-3 bg-slate-900/70 border border-slate-800 rounded-md text-[11px] text-slate-400 space-y-1 leading-relaxed">
                <p className="font-bold text-slate-200 flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  Dual-Commit Architecture
                </p>
                <p>
                  Publishing saves the vacancy to both the flat search index (<code className="text-slate-300">featured_jobs_cache</code>) and the school subcollection (<code className="text-slate-300">schools/{'{id}'}/jobs</code>) for maximum speed.
                </p>
              </div>
            </div>

            {/* Feedback Alert */}
            {feedbackMessage && (
              <div className={cn(
                "p-3 rounded-md text-xs font-semibold flex items-center gap-2",
                feedbackMessage.type === 'success' 
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" 
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              )}>
                {feedbackMessage.type === 'success' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('approved')}
                className="w-full bg-[#FF6B35] hover:bg-[#ff5514] text-white font-bold text-xs py-2.5 px-4 rounded-md shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                <span>Publish Directly to Live Feed</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit('pending_review')}
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-slate-300 hover:text-white font-bold text-xs py-2 px-4 rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Save to Admin Staging Queue</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
