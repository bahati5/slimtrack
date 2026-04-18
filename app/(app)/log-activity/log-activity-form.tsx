"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  activityKcalEstimate,
  stepsToKcal,
} from "@/lib/calculations/steps-kcal";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/toast";
import { MediaUploader } from "@/components/shared/media-uploader";
import { formatKcal, todayHrefAfterLog, todayIso } from "@/lib/utils/format";
import {
  Play,
  Dumbbell,
  Footprints,
  Gauge,
  Bike,
  Waves,
  Activity,
} from "lucide-react";

type ActivityType =
  | "youtube"
  | "gym"
  | "walk"
  | "run"
  | "cycling"
  | "swim"
  | "other";

const TYPES: {
  value: ActivityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "youtube", label: "YouTube", icon: Play },
  { value: "gym", label: "Salle", icon: Dumbbell },
  { value: "walk", label: "Marche", icon: Footprints },
  { value: "run", label: "Course", icon: Gauge },
  { value: "cycling", label: "Vélo", icon: Bike },
  { value: "swim", label: "Natation", icon: Waves },
  { value: "other", label: "Autre", icon: Activity },
];

export function LogActivityForm({
  userId: _userId,
  weightKg,
}: {
  userId: string;
  weightKg: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [type, setType] = useState<ActivityType>("youtube");
  const [name, setName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeThumb, setYoutubeThumb] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [steps, setSteps] = useState<number | "">("");
  const [kcal, setKcal] = useState<number | "">("");
  const [kcalTouched, setKcalTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? todayIso();

  // Estimation automatique
  const estimated = useMemo(() => {
    if (type === "walk" || type === "run") {
      const s = typeof steps === "number" ? steps : 0;
      const walkKcal = stepsToKcal(s, weightKg);
      const activityK = activityKcalEstimate(type, duration, weightKg);
      return Math.max(walkKcal, activityK);
    }
    return activityKcalEstimate(type, duration, weightKg);
  }, [type, duration, steps, weightKg]);

  useEffect(() => {
    if (!kcalTouched) setKcal(estimated);
  }, [estimated, kcalTouched]);

  // YouTube oEmbed
  useEffect(() => {
    if (type !== "youtube" || !youtubeUrl) {
      setYoutubeThumb(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/youtube-oembed?url=${encodeURIComponent(youtubeUrl)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.thumbnail_url) setYoutubeThumb(data.thumbnail_url);
        if (data.title && !name) setName(data.title);
      } catch {
        /* noop */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [youtubeUrl, type, name]);

  async function submit() {
    if (!name) {
      toast.warning("Donne un nom à ton activité");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: dl } = await supabase.rpc("get_or_create_daily_log", {
      p_date: date,
    });
    if (!dl) {
      toast.error("Impossible de créer le journal");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("activities").insert({
      user_id: user.id,
      daily_log_id: dl.id,
      activity_type: type,
      name,
      youtube_url: type === "youtube" ? youtubeUrl || null : null,
      youtube_thumbnail: youtubeThumb,
      duration_min: duration,
      kcal_burned: typeof kcal === "number" ? kcal : estimated,
      steps: typeof steps === "number" ? steps : null,
      media_urls: media,
      notes: notes || null,
      done_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Activité enregistrée 💪");
    router.push(todayHrefAfterLog(date));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Type d&apos;activité</CardTitle>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const active = type === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-medium ${
                  active
                    ? "bg-gradient-primary text-white"
                    : "bg-[var(--color-card-soft)] text-[var(--color-muted)]"
                }`}>
                <Icon className="size-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </Card>

      {type === "youtube" && (
        <Card className="space-y-3">
          <CardTitle>Vidéo YouTube</CardTitle>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              placeholder="https://www.youtube.com/watch?v=…"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
          {youtubeThumb && (
            <div className="relative aspect-video overflow-hidden rounded-2xl">
              <Image src={youtubeThumb} alt="" fill className="object-cover" />
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-3">
        <CardTitle>Détails</CardTitle>
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input
            placeholder={
              type === "youtube"
                ? "Yoga Pamela Reif 30min"
                : type === "run"
                  ? "Course matinale"
                  : "Ma séance"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Durée</Label>
            <span className="text-sm font-semibold">{duration} min</span>
          </div>
          <Slider
            value={duration}
            onChange={setDuration}
            min={5}
            max={180}
            step={5}
          />
        </div>

        {(type === "walk" || type === "run") && (
          <div className="space-y-1.5">
            <Label>Nombre de pas</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={steps}
              onChange={(e) =>
                setSteps(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="ex: 8000"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label>Kcal dépensées</Label>
            <p className="text-xs text-[var(--color-muted)]">
              Estimation basée sur ta masse ({weightKg} kg)
            </p>
          </div>
          <Badge tone="success">Estimé : {formatKcal(estimated)}</Badge>
        </div>
        <Input
          type="number"
          inputMode="numeric"
          value={kcal}
          onChange={(e) => {
            setKcalTouched(true);
            setKcal(e.target.value === "" ? "" : Number(e.target.value));
          }}
        />

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Photos preuve</CardTitle>
        <MediaUploader
          value={media}
          onChange={setMedia}
          kind="activity"
          date={date}
          max={3}
          accept="image/*"
        />
      </Card>

      <Button block size="lg" loading={saving} onClick={submit}>
        Enregistrer l&apos;activité
      </Button>
    </div>
  );
}
