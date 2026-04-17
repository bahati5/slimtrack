"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

  const filteredWeights = useMemo(() => {
    const limit = new Date(serverNow);
    limit.setDate(limit.getDate() - range);
    return weights.filter((w) => new Date(w.logged_at) >= limit);
  }, [weights, range, serverNow]);

  const filteredLogs = useMemo(() => {
    const limit = new Date(serverNow);
    limit.setDate(limit.getDate() - range);
    return logs.filter((l) => new Date(l.log_date) >= limit);
  }, [logs, range, serverNow]);

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
      <div className="flex items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              range === r.value
                ? "bg-gradient-primary text-white"
                : "bg-[var(--color-card)] text-[var(--color-muted)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card>
        <CardTitle>Poids</CardTitle>
        <CardDescription>
          {filteredWeights.length
            ? `${filteredWeights.length} pesées`
            : "Aucune pesée récente"}
        </CardDescription>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredWeights}>
              <defs>
                <linearGradient id="weight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#efd09e" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#efd09e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#3d3d3d" strokeDasharray="3 3" />
              <XAxis
                dataKey="logged_at"
                tick={{ fill: "#a89782", fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
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
                type="monotone"
                dataKey="weight_kg"
                stroke="#d4aa7d"
                fill="url(#weight)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>Kcal vs Objectif</CardTitle>
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredLogs}>
              <CartesianGrid stroke="#3d3d3d" strokeDasharray="3 3" />
              <XAxis
                dataKey="log_date"
                tick={{ fill: "#a89782", fontSize: 10 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fill: "#a89782", fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  background: "#272727",
                  border: "1px solid #3d3d3d",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="net_kcal" fill="#efd09e" radius={[6, 6, 0, 0]} />
              <Line
                type="monotone"
                dataKey="target_kcal"
                stroke="#9ec9a7"
                strokeWidth={2}
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

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
          {filteredLogs.slice(-70).map((l) => (
            <div
              key={l.log_date}
              className={`aspect-square rounded ${
                l.deficit_respected
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--color-warning)]/40"
              }`}
              title={`${l.log_date} : ${l.net_kcal} / ${l.target_kcal ?? "—"}`}
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
