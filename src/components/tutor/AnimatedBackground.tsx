import type { ReactNode } from "react";

export function AnimatedBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="ab-base" aria-hidden />
      <div className="ab-blob ab-blob-1" aria-hidden />
      <div className="ab-blob ab-blob-2" aria-hidden />
      <div className="ab-blob ab-blob-3" aria-hidden />
      <div className="relative z-10">{children}</div>
      <style>{`
        .ab-base {
          position: absolute; inset: 0;
          background:
            radial-gradient(120% 80% at 100% 0%, #fff3d6 0%, transparent 55%),
            radial-gradient(120% 80% at 0% 0%, #d6f0ff 0%, transparent 55%),
            radial-gradient(80% 60% at 50% 100%, #ece5ff 0%, transparent 60%),
            linear-gradient(180deg, #f5fbff 0%, #fbfaff 100%);
          animation: ab-pan 28s ease-in-out infinite alternate;
          will-change: transform, filter;
        }
        .ab-blob {
          position: absolute; border-radius: 9999px; filter: blur(70px);
          opacity: .55; mix-blend-mode: screen; will-change: transform;
        }
        .ab-blob-1 {
          width: 520px; height: 520px; left: -120px; top: -120px;
          background: radial-gradient(circle, #bfe3ff 0%, transparent 70%);
          animation: ab-float-a 22s ease-in-out infinite alternate;
        }
        .ab-blob-2 {
          width: 560px; height: 560px; right: -140px; top: -80px;
          background: radial-gradient(circle, #ffe9bf 0%, transparent 70%);
          animation: ab-float-b 26s ease-in-out infinite alternate;
        }
        .ab-blob-3 {
          width: 600px; height: 600px; left: 50%; bottom: -240px; transform: translateX(-50%);
          background: radial-gradient(circle, #e2d4ff 0%, transparent 70%);
          animation: ab-float-c 24s ease-in-out infinite alternate;
        }
        @keyframes ab-pan {
          0%   { transform: scale(1) translate3d(0,0,0); filter: hue-rotate(0deg); }
          100% { transform: scale(1.04) translate3d(-1%, 1%, 0); filter: hue-rotate(6deg); }
        }
        @keyframes ab-float-a {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(40px, 30px, 0); }
        }
        @keyframes ab-float-b {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50px, 40px, 0); }
        }
        @keyframes ab-float-c {
          0%   { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(calc(-50% + 30px), -20px, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ab-base, .ab-blob { animation: none !important; }
        }
      `}</style>
    </div>
  );
}