"use client";

import { useEffect, useRef, useState } from "react";
import { fetchNextChallengeTimer } from "@/lib/api";

export default function Timer() {
  const [formatted, setFormatted] = useState("--h--m--s");
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const data = await fetchNextChallengeTimer();
        setSeconds(data.seconds_remaining);
      } catch {
        setSeconds(86400);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [seconds]);

  useEffect(() => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    setFormatted(
      `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`
    );
  }, [seconds]);

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs text-gray-400 uppercase tracking-widest">
        Prochain défi dans
      </p>
      <p className="text-2xl font-mono font-bold text-yellow-400 tabular-nums">
        {formatted}
      </p>
    </div>
  );
}
