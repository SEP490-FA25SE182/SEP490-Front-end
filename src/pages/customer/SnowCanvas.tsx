import { useEffect, useRef } from "react";

type SnowCanvasProps = {
  className?: string;
  // mật độ tuyết (0.6–1.6)
  density?: number;
};

type Flake = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function SnowCanvas({ className, density = 1 }: SnowCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * DPR);
      canvas.height = Math.floor(rect.height * DPR);
    };

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const flakeCount = () => {
      const area = canvas.width * canvas.height;
      // theo diện tích + density
      return clamp(Math.floor((area / 35000) * density), 140, 520);
    };

    const makeFlake = (w: number, h: number): Flake => ({
      x: rand(0, w),
      y: rand(-h, 0),
      vx: rand(-0.35, 0.35) * DPR,
      vy: rand(0.75, 1.8) * DPR,
      r: rand(0.8, 2.2) * DPR,
      a: rand(0.55, 0.95),
    });

    const resetFlakes = () => {
      const w = canvas.width;
      const h = canvas.height;
      flakes = Array.from({ length: flakeCount() }, () => makeFlake(w, h));
    };

    resize();
    let flakes: Flake[] = [];
    resetFlakes();

    // resize “hard”: đổi size đáng kể thì re-init flakes
    let lastW = canvas.width;
    let lastH = canvas.height;

    const onResize = () => {
      resize();
      const w = canvas.width;
      const h = canvas.height;
      if (Math.abs(w - lastW) > 20 || Math.abs(h - lastH) > 20) {
        lastW = w;
        lastH = h;
        resetFlakes();
      }
    };

    window.addEventListener("resize", onResize);

    const loop = (now: number) => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // update + draw
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (const f of flakes) {
        // movement
        f.x += f.vx;
        f.y += f.vy;

        // gió nhẹ theo thời gian
        f.x += Math.sin(now / 900 + f.y / 120) * 0.22 * DPR;

        // wrap ngang
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        // respawn khi rơi khỏi đáy
        if (f.y - f.r > h + 10) {
          f.x = rand(0, w);
          f.y = rand(-h * 0.2, 0);
          f.vx = rand(-0.35, 0.35) * DPR;
          f.vy = rand(0.8, 1.9) * DPR;
          f.r = rand(0.8, 2.2) * DPR;
          f.a = rand(0.55, 0.95);
        }

        // core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${f.a})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();

        // glow
        ctx.beginPath();
        ctx.fillStyle = `rgba(150,220,255,${f.a * 0.25})`;
        ctx.arc(f.x, f.y, f.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      className={[
        "absolute inset-0 w-full h-full pointer-events-none",
        className || "",
      ].join(" ")}
    />
  );
}
