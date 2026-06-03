import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Grana sottile (SVG noise) per dare materia allo sfondo, senza immagini esterne.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
}

/**
 * Cornice condivisa per Login e Cambio password: atmosfera calda "da santuario"
 * (gradiente radiale, alone dorato, grana) + card crema centrata.
 */
export function AuthLayout({ title, subtitle, eyebrow = 'Area riservata', children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10
                    bg-[radial-gradient(circle_at_50%_-10%,#6e4f3a_0%,#472b21_45%,#281D02_100%)]">
      {/* Alone dorato come luce di candela */}
      <div className="pointer-events-none absolute -top-44 left-1/2 h-[520px] w-[520px] -translate-x-1/2
                      rounded-full bg-[#A67D51]/25 blur-[130px]" />
      {/* Grana */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
           style={{ backgroundImage: GRAIN }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo con alone */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 scale-125 rounded-full bg-[#d3b282]/40 blur-2xl" />
            <img
              src="/logo.png"
              alt="Missionari della Via"
              className="relative mx-auto h-24 w-24 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#d3b282]/30 bg-brown-50/95
                        shadow-[0_28px_70px_-20px_rgba(0,0,0,0.7)] backdrop-blur">
          {/* Filetto dorato superiore */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#A67D51] to-transparent" />
          <div className="px-8 pb-8 pt-7">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#A67D51]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-center font-display text-3xl font-bold leading-tight text-brown-800">
              {title}
            </h1>
            {subtitle && (
              <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-brown-500/80">
                {subtitle}
              </p>
            )}
            <div className="mt-6">{children}</div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs tracking-wide text-[#d3b282]/60">
          Missionari della Via · Admin Dashboard
        </p>
      </motion.div>
    </div>
  );
}
