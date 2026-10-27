"use client";

interface LivesBarProps {
  lives: number;
  maxLives?: number;
}

export default function LivesBar({ lives, maxLives = 10 }: LivesBarProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-gray-400 uppercase tracking-widest">
        Vies restantes
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: maxLives }).map((_, i) => {
          const isAlive = i < lives;
          return (
            <span
              key={i}
              className={`
                text-2xl transition-all duration-500
                ${isAlive
                  ? "opacity-100 scale-100"
                  : "opacity-20 scale-75 grayscale"
                }
                ${!isAlive && i === lives ? "animate-bounce-once" : ""}
              `}
              style={{
                filter: isAlive ? "drop-shadow(0 0 6px #ef4444)" : "none",
                transitionDelay: `${i * 30}ms`,
              }}
            >
              {isAlive ? "❤️" : "🖤"}
            </span>
          );
        })}
      </div>
      {lives === 0 && (
        <p className="text-red-400 font-bold text-sm animate-pulse mt-1">
          Plus de vies !
        </p>
      )}
    </div>
  );
}
