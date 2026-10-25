export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayDateString(): string {
  return formatISODate(new Date());
}

export function getPastDates(daysCount: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatISODate(d));
  }
  return dates;
}

export function getFutureDates(daysCount: number, fromDate: Date = new Date()): string[] {
  const dates: string[] = [];
  const base = new Date(fromDate);
  base.setHours(0, 0, 0, 0);

  for (let i = 1; i <= daysCount; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(formatISODate(d));
  }
  return dates;
}

export function formatHumanDate(dateStr: string): string {
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getDayOfWeek(dateStr: string): number {
  return parseISODate(dateStr).getDay(); // 0 is Sunday, 6 is Saturday
}

export function calculateHabitStreaks(datesWithCompletion: Set<string>): {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
} {
  const totalCompletions = datesWithCompletion.size;
  if (totalCompletions === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCompletions: 0 };
  }

  const sortedDates = Array.from(datesWithCompletion).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const currentDate = parseISODate(dateStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currentDate;
  }

  // Calculate current streak backwards from today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatISODate(today);
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = formatISODate(yesterday);

  let currentStreak = 0;
  let checkDate = datesWithCompletion.has(todayStr)
    ? today
    : datesWithCompletion.has(yesterdayStr)
    ? yesterday
    : null;

  if (checkDate) {
    let runner = new Date(checkDate);
    while (datesWithCompletion.has(formatISODate(runner))) {
      currentStreak++;
      runner.setDate(runner.getDate() - 1);
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletions
  };
}
