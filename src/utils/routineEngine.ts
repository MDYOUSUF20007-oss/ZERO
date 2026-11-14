import type { RecurringSchedule } from '../types';

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = Math.max(0, Math.min(23, parseInt(parts[0], 10) || 0));
  const minutes = Math.max(0, Math.min(59, parseInt(parts[1], 10) || 0));
  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isOvernightSchedule(startTime: string, endTime: string): boolean {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  return startMins > endMins;
}

export function isScheduleActiveNow(
  schedule: RecurringSchedule,
  now: Date = new Date()
): boolean {
  if (!schedule || !schedule.isEnabled) return false;
  if (!Array.isArray(schedule.days) || schedule.days.length === 0) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = parseTimeToMinutes(schedule.startTime);
  const endMins = parseTimeToMinutes(schedule.endTime);
  const todayDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const yesterdayDay = (todayDay + 6) % 7;

  if (startMins <= endMins) {
    // Normal single-day range (e.g., 09:00 - 17:00)
    const isInTimeRange = currentMins >= startMins && currentMins < endMins;
    return isInTimeRange && schedule.days.includes(todayDay);
  } else {
    // Overnight range (e.g., 22:00 - 02:00)
    // Evening part: from 22:00 to 23:59:59 on the scheduled start day
    const isEveningPart = currentMins >= startMins && schedule.days.includes(todayDay);
    // Morning part: from 00:00 to 02:00 following yesterday's scheduled start day
    const isMorningPart = currentMins < endMins && schedule.days.includes(yesterdayDay);
    return isEveningPart || isMorningPart;
  }
}

export function getScheduleRemainingSeconds(
  schedule: RecurringSchedule,
  now: Date = new Date()
): number {
  if (!isScheduleActiveNow(schedule, now)) return 0;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const currentSecs = currentMins * 60 + now.getSeconds();
  const endMins = parseTimeToMinutes(schedule.endTime);
  const endSecs = endMins * 60;

  if (endSecs > currentSecs) {
    return endSecs - currentSecs;
  } else {
    // Crosses midnight
    return (86400 - currentSecs) + endSecs;
  }
}

export function isScheduleWarningActive(
  schedule: RecurringSchedule,
  warningThresholdMinutes = 5,
  now: Date = new Date()
): boolean {
  if (!schedule || !schedule.isEnabled) return false;
  const todayDay = now.getDay();
  if (!schedule.days.includes(todayDay)) return false;

  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = parseTimeToMinutes(schedule.startTime);

  const diff = startMins - currentMins;
  return diff > 0 && diff <= warningThresholdMinutes;
}

export function syncRoutinesToNative(schedules: RecurringSchedule[]): void {
  try {
    const jsonStr = JSON.stringify(schedules || []);
    if (typeof window !== 'undefined' && window.ZeroNative) {
      if (typeof window.ZeroNative.syncRoutinesToNative === 'function') {
        window.ZeroNative.syncRoutinesToNative(jsonStr);
      } else if (typeof window.ZeroNative.setRoutinesJson === 'function') {
        window.ZeroNative.setRoutinesJson(jsonStr);
      }
    }
  } catch {
    // Silently continue if native interface is not yet attached
  }
}

export function checkAndEnforceRoutines(
  schedules: RecurringSchedule[],
  now: Date = new Date()
): { activeSchedule: RecurringSchedule | null } {
  syncRoutinesToNative(schedules);

  for (const schedule of schedules) {
    if (isScheduleActiveNow(schedule, now)) {
      return { activeSchedule: schedule };
    }
  }
  return { activeSchedule: null };
}
