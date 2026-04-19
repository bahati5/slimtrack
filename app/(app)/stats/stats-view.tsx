"use client";

import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

type WLog = { weight_kg: number; logged_at: string };
type DLog = {
  log_date: string;
  total_kcal_eaten: number;
  total_kcal_burned: number;
  steps_kcal_burned: number;
  net_kcal: number;
  target_kcal: number | null;
  deficit_respected: boolean;
};

/** Jour calendaire rempli (0 kcal si aucune entrée ce jour-là). */
type DLogDense = DLog & { hasData: boolean };
type Measure = Record<string, number | string | null>;

const RANGES = [
  { value: 30, label: "30j" },
  { value: 90, label: "90j" },
  { value: 180, label: "6 mois" },
] as const;

export function StatsView({
  weights,
  logs,
  measures,
  serverNow,
}: {
  weights: WLog[];
  logs: DLog[];
  measures: Measure[];
  serverNow: string;
}) {
  const [range, setRange] = useState<number>(30);
  const [granularity, setGranularity] = useState<"day" | "week">("day");

  /** Date minimale incluse (YYYY-MM-DD), comparée aux colonnes `date` Supabase. */
  const cutoffDateStr = useMemo(() => {
    return format(subDays(new Date(serverNow), range), "yyyy-MM-dd");
  }, [serverNow, range]);

  const filteredWeights = useMemo(() => {
    return weights.filter((w) => w.logged_at >= cutoffDateStr);
  }, [weights, cutoffDateStr]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => l.log_date >= cutoffDateStr);
  }, [logs, cutoffDateStr]);

  const todayStr = useMemo(
    () => format(new Date(serverNow), "yyyy-MM-dd"),
    [serverNow],
  );

  const logsByDate = useMemo(() => {
    const m = new Map<string, DLog>();
    for (const l of filteredLogs) m.set(l.log_date, l);
    return m;
  }, [filteredLogs]);

  /** Tous les jours entre la coupure et aujourd’hui (pour que 90j = 90 colonnes possibles). */
  const denseDailyLogs = useMemo((): DLogDense[] => {
    const start = parseISO(cutoffDateStr);
    const end = parseISO(todayStr);
    if (start > end) return [];
    const days = eachDayOfInterval({ start, end });
    let lastTarget: number | null = null;
    return days.map((day) => {
      const iso = format(day, "yyyy-MM-dd");
      const row = logsByDate.get(iso);
      if (row) {
        if (row.target_kcal != null) lastTarget = row.target_kcal;
        return { ...row, hasData: true };
      }
      return {
        log_date: iso,
        total_kcal_eaten: 0,
        total_kcal_burned: 0,
        steps_kcal_burned: 0,
        net_kcal: 0,
        target_kcal: lastTarget,
        deficit_respected: true,
        hasData: false,
      };
    });
  }, [cutoffDateStr, todayStr, logsByDate]);

  const denseDailyWeights = useMemo(() => {
    const startD = parseISO(cutoffDateStr);
    const endD = parseISO(todayStr);
    if (startD > endD) return [];
    const sorted = [...filteredWeights].sort((a, b) =>
      a.logged_at.localeCompare(b.logged_at),
    );
    const days = eachDayOfInterval({
      start: startD,
      end: endD,
    });
    let idx = 0;
    let lastW: number | null = null;
    return days.map((day) => {
      const iso = format(day, "yyyy-MM-dd");
      while (idx < sorted.length && sorted[idx].logged_at <= iso) {
        lastW = sorted[idx].weight_kg;
        idx++;
      }
      return {
        logged_at: iso,
        tick: iso.slice(5),
        weight_kg: lastW,
      };
    });
  }, [filteredWeights, cutoffDateStr, todayStr]);

  function pickRange(value: number) {
    setRange(value);
    if (value >= 90) setGranularity("week");
    else setGranularity("day");
  }

  const weeklyWeights = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const w of filteredWeights) {
      const wk = format(
        startOfWeek(parseISO(w.logged_at + "T12:00:00"), {
          weekStartsOn: 1,
        }),
        "yyyy-MM-dd",
      );
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk)!.push(w.weight_kg);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, arr]) => ({
        tick: key,
        label: format(parseISO(key + "T12:00:00"), "d MMM", { locale: fr }),
        weight_kg: Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10,
      }));
  }, [filteredWeights]);

  const weeklyLogs = useMemo(() => {
    const map = new Map<
      string,
      {
        nets: number[];
        eaten: number[];
        targets: number[];
        ok: number;
        n: number;
      }
    >();
    for (const l of filteredLogs) {
      const wk = format(
        startOfWeek(parseISO(l.log_date + "T12:00:00"), { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      if (!map.has(wk))
        map.set(wk, { nets: [], eaten: [], targets: [], ok: 0, n: 0 });
      const m = map.get(wk)!;
      m.nets.push(l.net_kcal);
      m.eaten.push(l.total_kcal_eaten);
      if (l.target_kcal != null) m.targets.push(l.target_kcal);
      if (l.deficit_respected) m.ok++;
      m.n++;
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, m]) => ({
        tick: key,
        label: format(parseISO(key + "T12:00:00"), "d MMM", { locale: fr }),
        net_kcal: Math.round(m.nets.reduce((s, x) => s + x, 0) / m.nets.length),
        total_kcal_eaten: Math.round(
          m.eaten.reduce((s, x) => s + x, 0) / m.eaten.length,
        ),
        target_kcal:
          m.targets.length > 0
            ? Math.round(
                m.targets.reduce((s, x) => s + x, 0) / m.targets.length,
              )
            : null,
        deficit_respected: m.ok >= m.n / 2,
        okDays: m.ok,
        totalDays: m.n,
      }));
  }, [filteredLogs]);

  const streak = useMemo(() => {
    // plus long streak consécutif de déficit respecté, en remontant depuis aujourd'hui
    let s = 0;
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].deficit_respected) s++;
      else break;
    }
    return s;
  }, [logs]);

  const [latest, prev] = measures;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => pickRange(r.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              range === r.value
                ? "bg-gradient-primary text-white"
                : "bg-[var(--color-card)] text-[var(--color-muted)]"
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-[var(--color-border)] sm:inline" />
        <button
          type="button"
          onClick={() => setGranularity("day")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium ${
            granularity === "day"
              ? "bg-[var(--color-card-soft)] text-[var(--color-text)] ring-1 ring-[var(--color-primary)]"
              : "bg-[var(--color-card)] text-[var(--color-muted)]"
          }`}>
          Par jour
        </button>
        <button
          type="button"
          onClick={() => setGranularity("week")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium ${
            granularity === "week"
              ? "bg-[var(--color-card-soft)] text-[var(--color-text)] ring-1 ring-[var(--color-primary)]"
              : "bg-[var(--color-card)] text-[var(--color-muted)]"
          }`}>
          Par semaine
        </button>
      </div>

      <Card>
        <CardTitle>Poids</CardTitle>
        <CardDescription>
          {granularity === "day"
            ? filteredWeights.length
              ? `${filteredWeights.length} pesée(s)`
              : "Aucune pesée récente"
            : weeklyWeights.length
              ? `${weeklyWeights.length} semaine(s) (moyenne)`
              : "Pas assez de données"}
        </CardDescription>
        <div
          className={
            granularity === "day" && denseDailyWeights.length > 45
              ? "mt-3 h-48 overflow-x-auto"
              : "mt-3 h-48"
          }>
          <div
            className="h-full min-h-[12rem]"
            style={
              granularity === "day" && denseDailyWeights.length > 45
                ? {
                    width: Math.max(320, denseDailyWeights.length * 5),
                    minWidth: "100%",
                  }
                : { width: "100%" }
            }>
            <ResponsiveContainer
              width="100%"
              height="100%"
              key={`w-${range}-${granularity}`}>
              <AreaChart
                data={
                  (granularity === "day" ? denseDailyWeights : weeklyWeights) as Record<string, unknown>[]
                }>
              <defs>
                <linearGradient id="weight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#efd09e" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#efd09e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3d3d3d" strokeDasharray="3 3" />
              <XAxis
                dataKey={granularity === "day" ? "tick" : "label"}
                tick={{ fill: "#a89782", fontSize: 9 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tick={{ fill: "#a89782", fontSize: 10 }}
                domain={["dataMin - 1", "dataMax + 1"]}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "#272727",
                  border: "1px solid #3d3d3d",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#a89782" }}
              />
              <Area
                type="stepAfter"
                dataKey="weight_kg"
                stroke="#d4aa7d"
                fill="url(#weight)"
                strokeWidth={2}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Kcal nettes vs objectif</CardTitle>
        <CardDescription>
          {granularity === "week"
            ? "Moyennes hebdomadaires (kcal mangées et bilan net)."
            : `Chaque jour du calendrier sur ${range} jours (0 kcal si rien n’a été saisi).`}
        </CardDescription>
        <div
          className={
            granularity === "day" && denseDailyLogs.length > 45
              ? "mt-3 h-48 overflow-x-auto"
              : "mt-3 h-48"
          }>
          <div
            className="h-full min-h-[12rem]"
            style={
              granularity === "day" && denseDailyLogs.length > 45
                ? {
                    width: Math.max(320, denseDailyLogs.length * 5),
                    minWidth: "100%",
                  }
                : { width: "100%" }
            }>
          <ResponsiveContainer
            width="100%"
            height="100%"
            key={`k-${range}-${granularity}`}>
            <ComposedChart
              data={
                (granularity === "day" ? denseDailyLogs : weeklyLogs) as Record<string, unknown>[]
              }>
              <CartesianGrid stroke="#3d3d3d" strokeDasharray="3 3" />
              <XAxis
                dataKey={granularity === "day" ? "log_date" : "label"}
                tick={{ fill: "#a89782", fontSize: 9 }}
                tickFormatter={(d: string) =>
                  granularity === "day" ? String(d).slice(5) : d
                }
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis tick={{ fill: "#a89782", fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  background: "#272727",
                  border: "1px solid #3d3d3d",
                  borderRadius: 12,
                }}
              />
              <Bar
                dataKey="total_kcal_eaten"
                fill="#efd09e"
                name="Mangées"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="net_kcal"
                stroke="#7a4535"
                strokeWidth={2}
                dot={false}
                name="Bilan net"
              />
              <Line
                type="monotone"
                dataKey="target_kcal"
                stroke="#9ec9a7"
                strokeWidth={2}
                dot={false}
                name="Objectif"
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {granularity === "week" && weeklyLogs.length > 0 ? (
        <Card>
          <CardTitle>Déficit / semaine</CardTitle>
          <CardDescription>
            Jours avec déficit respecté sur la période (lundi–dimanche).
          </CardDescription>
          <ul className="mt-3 space-y-2 text-sm">
            {weeklyLogs.map((w) => (
              <li
                key={w.tick}
                className="flex items-center justify-between rounded-2xl bg-[var(--color-card-soft)] px-3 py-2">
                <span className="text-[var(--color-muted)]">Sem. {w.label}</span>
                <span className="font-semibold">
                  {w.okDays}/{w.totalDays} jours OK
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="flex items-center justify-between">
        <div>
          <CardTitle>Série actuelle</CardTitle>
          <CardDescription>
            Jours consécutifs de déficit respecté
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-gradient-primary px-4 py-2 text-white">
          <Flame className="size-5" />
          <span className="text-2xl font-bold">{streak}</span>
          <span className="text-xs">j</span>
        </div>
      </Card>

      <Card>
        <CardTitle>Heatmap compliance</CardTitle>
        <div className="mt-3 grid grid-cols-10 gap-1 sm:grid-cols-14">
          {denseDailyLogs.slice(-70).map((l) => (
            <div
              key={l.log_date}
              className={`aspect-square rounded ${
                !l.hasData
                  ? "bg-[var(--color-card-soft)]"
                  : l.deficit_respected
                    ? "bg-[var(--color-success)]"
                    : "bg-[var(--color-warning)]/40"
              }`}
              title={
                l.hasData
                  ? `${l.log_date} : ${l.net_kcal} / ${l.target_kcal ?? "—"}`
                  : `${l.log_date} : aucune entrée`
              }
            />
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Mensurations</CardTitle>
        <CardDescription>
          Dernière mesure comparée à la précédente.
        </CardDescription>
        {latest ? (
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Taille", "waist_cm"],
              ["Hanches", "hips_cm"],
              ["Poitrine", "chest_cm"],
              ["Cuisse G.", "left_thigh_cm"],
              ["Cuisse D.", "right_thigh_cm"],
              ["Bras G.", "left_arm_cm"],
              ["Bras D.", "right_arm_cm"],
            ].map(([lbl, key]) => {
              const v = latest?.[key] as number | null | undefined;
              const p = prev?.[key] as number | null | undefined;
              if (v == null) return null;
              const delta = p != null ? Math.round((v - p) * 10) / 10 : null;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl bg-[var(--color-card-soft)] p-3"
                >
                  <span className="text-[var(--color-muted)]">{lbl}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{v} cm</span>
                    {delta != null && delta !== 0 && (
                      <Badge tone={delta < 0 ? "success" : "warning"}>
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Aucune mensuration enregistrée.
          </p>
        )}
      </Card>
    </div>
  );
}
