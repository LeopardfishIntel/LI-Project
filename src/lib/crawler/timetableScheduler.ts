/**
 * Master Crawling Timetable & Seasonality Scheduler
 */

export type Season = "PEAK" | "OFF_PEAK";

export interface EngineScheduleConfig {
  engineKey: string;
  sourceName: string;
  method: string;
  peakSchedule: "DAILY" | "MWF" | "SUNDAY";
  offPeakSchedule: "MWF" | "MONDAY" | "EVERY_14_DAYS";
  utcStartWindow: string;
  utcEndWindow: string;
  targetDurationMinutes: number;
}

export const CRAWLER_TIMETABLE: Record<string, EngineScheduleConfig> = {
  TES: {
    engineKey: "TES",
    sourceName: "TES",
    method: "Public API / Lightweight Index",
    peakSchedule: "DAILY",
    offPeakSchedule: "MWF",
    utcStartWindow: "01:00",
    utcEndWindow: "01:30",
    targetDurationMinutes: 30
  },
  ISP: {
    engineKey: "ISP",
    sourceName: "ISP",
    method: "Workday CXS JSON API",
    peakSchedule: "DAILY",
    offPeakSchedule: "MWF",
    utcStartWindow: "01:30",
    utcEndWindow: "01:50",
    targetDurationMinutes: 20
  },
  NORD_ANGLIA: {
    engineKey: "NORD_ANGLIA",
    sourceName: "Nord Anglia",
    method: "Workday CXS JSON API",
    peakSchedule: "DAILY",
    offPeakSchedule: "MWF",
    utcStartWindow: "01:50",
    utcEndWindow: "02:10",
    targetDurationMinutes: 20
  },
  GRC: {
    engineKey: "GRC",
    sourceName: "GRC",
    method: "Form / Index Fetch",
    peakSchedule: "DAILY",
    offPeakSchedule: "MWF",
    utcStartWindow: "02:10",
    utcEndWindow: "02:30",
    targetDurationMinutes: 20
  },
  GEMS: {
    engineKey: "GEMS",
    sourceName: "GEMS Education",
    method: "Native Requisition API",
    peakSchedule: "DAILY",
    offPeakSchedule: "MWF",
    utcStartWindow: "02:30",
    utcEndWindow: "02:50",
    targetDurationMinutes: 20
  },
  GLOBEDUCATE: {
    engineKey: "GLOBEDUCATE",
    sourceName: "Globeducate",
    method: "DOM Parsing / Cheerio",
    peakSchedule: "MWF",
    offPeakSchedule: "MONDAY",
    utcStartWindow: "03:00",
    utcEndWindow: "03:20",
    targetDurationMinutes: 20
  },
  COGNITA: {
    engineKey: "COGNITA",
    sourceName: "Cognita",
    method: "CSOD API / DOM",
    peakSchedule: "MWF",
    offPeakSchedule: "MONDAY",
    utcStartWindow: "03:20",
    utcEndWindow: "03:40",
    targetDurationMinutes: 20
  },
  INSPIRED: {
    engineKey: "INSPIRED",
    sourceName: "Inspired Education",
    method: "Portal Parsing",
    peakSchedule: "MWF",
    offPeakSchedule: "MONDAY",
    utcStartWindow: "03:40",
    utcEndWindow: "04:00",
    targetDurationMinutes: 20
  },
  ESF: {
    engineKey: "ESF",
    sourceName: "ESF Hong Kong",
    method: "SuccessFactors API",
    peakSchedule: "MWF",
    offPeakSchedule: "MONDAY",
    utcStartWindow: "04:00",
    utcEndWindow: "04:15",
    targetDurationMinutes: 15
  },
  TAYLORS: {
    engineKey: "TAYLORS",
    sourceName: "Taylor's Group",
    method: "HTML / JobStreet Sync",
    peakSchedule: "MWF",
    offPeakSchedule: "MONDAY",
    utcStartWindow: "04:15",
    utcEndWindow: "04:30",
    targetDurationMinutes: 15
  },
  TEACH_AWAY: {
    engineKey: "TEACH_AWAY",
    sourceName: "Teach Away",
    method: "Lightweight HTML",
    peakSchedule: "MWF",
    offPeakSchedule: "MONDAY",
    utcStartWindow: "04:30",
    utcEndWindow: "04:45",
    targetDurationMinutes: 15
  },
  MALVERN: {
    engineKey: "MALVERN",
    sourceName: "Malvern Family",
    method: "DOM Parsing",
    peakSchedule: "SUNDAY",
    offPeakSchedule: "EVERY_14_DAYS",
    utcStartWindow: "05:00",
    utcEndWindow: "05:15",
    targetDurationMinutes: 15
  },
  UWC: {
    engineKey: "UWC",
    sourceName: "UWC Network",
    method: "Directory Parsing",
    peakSchedule: "SUNDAY",
    offPeakSchedule: "EVERY_14_DAYS",
    utcStartWindow: "05:15",
    utcEndWindow: "05:30",
    targetDurationMinutes: 15
  },
  TEACHER_HORIZONS: {
    engineKey: "TEACHER_HORIZONS",
    sourceName: "Teacher Horizons",
    method: "Target HTML Parsing",
    peakSchedule: "SUNDAY",
    offPeakSchedule: "EVERY_14_DAYS",
    utcStartWindow: "05:30",
    utcEndWindow: "05:45",
    targetDurationMinutes: 15
  }
};

export function getCurrentSeason(date: Date = new Date()): Season {
  const month = date.getUTCMonth() + 1;
  if ([10, 11, 12, 1, 2, 3].includes(month)) {
    return "PEAK";
  }
  return "OFF_PEAK";
}

export function shouldEngineRunToday(engineKey: string, date: Date = new Date()): boolean {
  const config = CRAWLER_TIMETABLE[engineKey.toUpperCase()];
  if (!config) return false;

  const season = getCurrentSeason(date);
  const dayOfWeek = date.getUTCDay();
  const activeRule = season === "PEAK" ? config.peakSchedule : config.offPeakSchedule;

  switch (activeRule) {
    case "DAILY":
      return true;
    case "MWF":
      return dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    case "MONDAY":
      return dayOfWeek === 1;
    case "SUNDAY":
      return dayOfWeek === 0;
    case "EVERY_14_DAYS": {
      const firstJan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const weekNumber = Math.ceil((((date.getTime() - firstJan.getTime()) / 86400000) + firstJan.getUTCDay() + 1) / 7);
      return dayOfWeek === 0 && weekNumber % 2 === 0;
    }
    default:
      return true;
  }
}
