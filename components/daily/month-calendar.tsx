"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  addMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type CalendarLog = {
  log_date: string;
  deficit_respected: boolean | null;
};

const WEEKDAY_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

export function MonthCalendar({
  date,
  userId,
  onSelectDate,
  serverToday,
}: {
  date: string;
  userId: string;
  onSelectDate: (date: string) => void;
  serverToday: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const selectedDate = parseISO(date);
  const todayDate = parseISO(serverToday);

  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(selectedDate),
  );

  useEffect(() => {
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(startOfMonth(selectedDate));
    }
  }, [selectedDate, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const yearMonth = format(monthStart, "yyyy-MM");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["calendar", userId, yearMonth],
    queryFn: async () => {
      const first = format(monthStart, "yyyy-MM-dd");
      const last = format(monthEnd, "yyyy-MM-dd");
      const { data } = await supabase
        .from("daily_logs")
        .select("log_date, deficit_respected")
        .eq("user_id", userId)
        .gte("log_date", first)
        .lte("log_date", last);
      return (data ?? []) as CalendarLog[];
    },
  });

  const logsByDate = useMemo(() => {
    const map: Record<string, CalendarLog> = {};
    for (const row of logs ?? []) map[row.log_date] = row;
    return map;
  }, [logs]);

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
          className="flex size-9 items-center justify-center rounded-xl text-[var(--color-text)] transition hover:bg-[var(--color-card-soft)]"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-sm font-semibold capitalize">
          {new Intl.DateTimeFormat("fr-FR", {
            month: "long",
            year: "numeric",
          }).format(monthStart)}
        </p>
        <button
          type="button"
          onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
          className="flex size-9 items-center justify-center rounded-xl text-[var(--color-text)] transition hover:bg-[var(--color-card-soft)]"
          aria-label="Mois suivant"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-muted)]">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1 font-medium">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayIso = format(day, "yyyy-MM-dd");
          const row = logsByDate[dayIso];
          const inMonth = isSameMonth(day, monthStart);
          const selected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, todayDate);
          const dotClass =
            row == null
              ? "bg-[var(--color-card-soft)]"
              : row.deficit_respected
                ? "bg-[var(--color-success)]"
                : "bg-[var(--color-accent)]";

          return (
            <button
              key={dayIso}
              type="button"
              onClick={() => onSelectDate(dayIso)}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border transition",
                selected
                  ? "border-[var(--color-primary)] bg-[var(--color-card)]"
                  : "border-transparent hover:bg-[var(--color-card-soft)]/70",
                !inMonth && "opacity-45",
              )}
              aria-label={`Voir le ${new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(day)}`}
            >
              <span className="text-xs font-medium">{format(day, "d")}</span>
              <span
                className={cn(
                  "size-2 rounded-full",
                  dotClass,
                  isToday && "ring-2 ring-[var(--color-primary)]/60 ring-offset-1",
                )}
              />
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-center text-xs text-[var(--color-muted)]">
          Chargement du calendrier…
        </p>
      ) : null}
    </Card>
  );
}
