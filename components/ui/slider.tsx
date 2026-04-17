"use client";
import { cn } from "@/lib/utils/cn";

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn(
        "w-full cursor-pointer appearance-none bg-transparent",
        "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[var(--color-border)]",
        "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[var(--color-border)]",
        "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-8px] [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-[#d4aa7d] [&::-webkit-slider-thumb]:to-[#efd09e] [&::-webkit-slider-thumb]:shadow-lg",
        "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--color-primary)]",
        className,
      )}
      style={{
        background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-accent) ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`,
        borderRadius: "9999px",
        height: "8px",
      }}
    />
  );
}
