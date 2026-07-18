"use client";
import { useEffect, useState } from "react";

interface Star { id: number; x: number; y: number; size: number; dur: string; delay: string; opacity: number; }
interface Meteor { id: number; x: number; y: number; dur: string; delay: string; }

interface StarFieldProps { count?: number; opacity?: number; meteors?: number; }

export default function StarField({ count = 60, opacity = 0.25, meteors: meteorCount = 4 }: StarFieldProps) {
  const [stars, setStars] = useState<Star[]>([]);
  const [meteorList, setMeteorList] = useState<Meteor[]>([]);

  useEffect(() => {
    setStars(Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.4,
      dur: `${2 + Math.random() * 4}s`,
      delay: `${Math.random() * 5}s`,
      opacity: Math.random() * 0.55 + 0.1,
    })));
    setMeteorList(Array.from({ length: meteorCount }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 60,
      y: 5 + Math.random() * 35,
      dur: `${1.8 + Math.random() * 1.4}s`,
      delay: `${i * 6 + Math.random() * 12}s`,
    })));
  }, [count, meteorCount]);

  if (!stars.length) return null;

  return (
    <>
      {stars.map((s) => (
        <div key={s.id} className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            opacity: s.opacity * opacity / 0.25,
            animation: `twinkle ${s.dur} ease-in-out infinite ${s.delay}`,
          }} />
      ))}
      {meteorList.map((m) => (
        <div key={`m-${m.id}`} className="absolute pointer-events-none"
          style={{
            left: `${m.x}%`, top: `${m.y}%`,
            width: 160, height: 1.5,
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(167,139,250,0.6) 35%, transparent 100%)",
            transform: "rotate(32deg)",
            animation: `meteor ${m.dur} ease-in ${m.delay} infinite`,
            opacity: 0,
          }} />
      ))}
    </>
  );
}
