import { useEffect, useRef } from "react";

type SakuraCanvasProps = {
  className?: string;
  density?: number; // 1.0 = mặc định, tăng lên để nhiều cánh hơn
  wind?: number; // -1..1 (gió trái/phải)
  speed?: number; // 1.0 = mặc định
  blur?: boolean; // bật blur nhẹ cho mềm
};

type Petal = {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  sway: number;
  swaySpeed: number;
  opacity: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function SakuraCanvas({
  className,
  density = 1.0,
  wind = 0.25,
  speed = 1.0,
  blur = true,
}: SakuraCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const petalsRef = useRef<Petal[]>([]);
  const lastTRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // (re)seed petals dựa trên diện tích
      const count = Math.floor((w * h) / 18000 * density); // tweak density here
      const arr: Petal[] = [];
      for (let i = 0; i < count; i++) {
        arr.push(makePetal(w, h, true));
      }
      petalsRef.current = arr;
    };

    const makePetal = (w: number, h: number, randomY = false): Petal => {
      const r = rand(4, 10);
      const baseVy = rand(18, 46) * speed;
      const baseVx = rand(-10, 10) + wind * 30;

      return {
        x: rand(0, w),
        y: randomY ? rand(0, h) : -rand(20, 200),
        r,
        vx: baseVx,
        vy: baseVy,
        rot: rand(0, Math.PI * 2),
        vr: rand(-1.2, 1.2) * 0.8,
        sway: rand(0, Math.PI * 2),
        swaySpeed: rand(0.8, 1.8) * 0.9,
        opacity: rand(0.45, 0.9),
      };
    };

    // expose makePetal to resize closure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (resize as any).makePetal = makePetal;

    const tick = (t: number) => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;

      const dt = lastTRef.current ? Math.min(0.034, (t - lastTRef.current) / 1000) : 0;
      lastTRef.current = t;

      ctx.clearRect(0, 0, w, h);

      if (blur) {
        ctx.filter = "blur(0.15px)";
      } else {
        ctx.filter = "none";
      }

      const petals = petalsRef.current;
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i];

        // motion
        p.sway += p.swaySpeed * dt;
        const swayX = Math.sin(p.sway) * (10 + p.r * 0.6);
        p.x += (p.vx + swayX) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        // wrap/recycle
        if (p.y - p.r > h + 40 || p.x < -80 || p.x > w + 80) {
          petals[i] = makePetal(w, h, false);
          continue;
        }

        drawPetal(ctx, p);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    const onResize = () => resize();
    resize();
    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [density, wind, speed, blur]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // pointer-events-none để không chặn click UI phía dưới
      style={{ pointerEvents: "none" }}
    />
  );
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);

  // shape: cánh hoa đơn giản (giống teardrop + notch)
  const w = p.r * 1.25;
  const h = p.r * 1.75;

  // gradient nhẹ
  const grad = ctx.createLinearGradient(-w, -h, w, h);
  grad.addColorStop(0, `rgba(255, 228, 238, ${p.opacity})`);
  grad.addColorStop(0.55, `rgba(255, 183, 205, ${p.opacity})`);
  grad.addColorStop(1, `rgba(255, 150, 190, ${p.opacity})`);

  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w, -h * 0.55, w, h * 0.35, 0, h);
  ctx.bezierCurveTo(-w, h * 0.35, -w, -h * 0.55, 0, -h);

  // notch (khe giữa)
  ctx.moveTo(0, -h * 0.45);
  ctx.quadraticCurveTo(p.r * 0.25, -h * 0.1, 0, 0);
  ctx.quadraticCurveTo(-p.r * 0.25, -h * 0.1, 0, -h * 0.45);

  ctx.fill();

  // viền rất nhẹ
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 0.6;
  ctx.stroke();

  ctx.restore();
}
