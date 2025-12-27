import { useEffect, useRef } from "react";

type SnowCanvasProps = {
  className?: string;
  // thời gian bắt đầu “nắn” thành người tuyết (ms)
  buildSnowmanAfterMs?: number;
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

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCuteSnowman(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  s: number
) {
  ctx.save();

  // ===== Sizes (tỉ lệ giống hình PNG) =====
  const rBot = 56 * s; // thân dưới
  const rMid = 44 * s; // thân giữa
  const rHead = 32 * s; // đầu

  // Centers
  const yBot = baseY - rBot;
  const yMid = yBot - rBot - rMid + 40 * s; // chồng lên 1 chút
  const yHead = yMid - rMid - rHead + 12 * s; // chồng lên 1 chút

  const headTopY = yHead - rHead;
  const neckY = yHead + rHead * 0.72; // vị trí quàng khăn (ổn định, không lệch)

  // ===== Style =====
  const outline = "rgba(20,20,30,0.22)"; // viền nhẹ giống hình 2
  const innerLight = "rgba(255,255,255,0.98)";
  const innerCool = "rgba(225,238,255,0.92)";

  const bodyGrad = (cy: number, r: number) => {
    const g = ctx.createRadialGradient(
      cx - 0.22 * r,
      cy - 0.22 * r,
      0.12 * r,
      cx,
      cy,
      r
    );
    g.addColorStop(0, innerLight);
    g.addColorStop(1, innerCool);
    return g;
  };

  const drawCircle = (cy: number, r: number) => {
    ctx.fillStyle = bodyGrad(cy, r);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  // ===== Body =====
  ctx.shadowColor = "rgba(160,220,255,0.18)";
  ctx.shadowBlur = 18 * s;
  drawCircle(yBot, rBot);
  drawCircle(yMid, rMid);
  drawCircle(yHead, rHead);
  ctx.shadowBlur = 0;

  // ===== Face =====
  // blush
  ctx.fillStyle = "rgba(255,105,180,0.24)";
  ctx.beginPath();
  ctx.arc(
    cx - 0.42 * rHead,
    yHead + 0.18 * rHead,
    0.28 * rHead,
    0,
    Math.PI * 2
  );
  ctx.arc(
    cx + 0.42 * rHead,
    yHead + 0.18 * rHead,
    0.28 * rHead,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // eyes
  ctx.fillStyle = "rgba(35,25,25,0.80)";
  const dot = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(cx - 0.33 * rHead, yHead - 0.18 * rHead, 2.6 * s);
  dot(cx + 0.33 * rHead, yHead - 0.18 * rHead, 2.6 * s);

  // mouth
  ctx.strokeStyle = "rgba(35,25,25,0.75)";
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.arc(
    cx,
    yHead + 0.2 * rHead,
    0.34 * rHead,
    0.15 * Math.PI,
    0.85 * Math.PI
  );
  ctx.stroke();

  // carrot nose (cân giữa mặt)
  ctx.fillStyle = "rgba(255,145,65,0.95)";
  ctx.beginPath();
  ctx.moveTo(cx + 0.04 * rHead, yHead - 0.02 * rHead);
  ctx.lineTo(cx + 0.72 * rHead, yHead + 0.1 * rHead);
  ctx.lineTo(cx + 0.06 * rHead, yHead + 0.22 * rHead);
  ctx.closePath();
  ctx.fill();

  // ===== Buttons (đặt theo yMid, không lệch) =====
  ctx.fillStyle = "rgba(35,25,25,0.55)";
  dot(cx, yMid - 0.1 * rMid, 3.1 * s);
  dot(cx, yMid + 0.18 * rMid, 3.1 * s);
  dot(cx, yMid + 0.46 * rMid, 3.1 * s);

  // ===== Scarf (neo vào neckY) =====
  // vòng khăn ôm cổ
  ctx.fillStyle = "rgba(220,40,50,0.96)";
  const scarfW = rMid * 1.35;
  const scarfH = rMid * 0.34;
  roundRectPath(
    ctx,
    cx - scarfW / 2,
    neckY - scarfH / 2,
    scarfW,
    scarfH,
    10 * s
  );
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1.6 * s;
  ctx.stroke();

  // đuôi khăn (thả xuống giữa thân)
  const tailW = rMid * 0.36;
  const tailH = rMid * 0.9;
  roundRectPath(
    ctx,
    cx - tailW * 0.15,
    neckY + scarfH * 0.35,
    tailW,
    tailH,
    12 * s
  );
  ctx.fill();

  // ===== Arms + mittens (găng nằm ở đúng đầu tay) =====
  ctx.strokeStyle = "rgba(120,80,40,0.60)";
  ctx.lineWidth = 3.2 * s;
  ctx.lineCap = "round";

  const armStartY = yMid + rMid * 0.05;
  const armStartLX = cx - rMid * 0.78;
  const armStartRX = cx + rMid * 0.78;

  const armLen = rMid * 1.15;
  const ang = -0.35; // ~ -20deg

  const endLX = armStartLX - Math.cos(ang) * armLen;
  const endLY = armStartY + Math.sin(ang) * armLen;
  const endRX = armStartRX + Math.cos(ang) * armLen;
  const endRY = armStartY + Math.sin(ang) * armLen;

  // sticks
  ctx.beginPath();
  ctx.moveTo(armStartLX, armStartY);
  ctx.lineTo(endLX, endLY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(armStartRX, armStartY);
  ctx.lineTo(endRX, endRY);
  ctx.stroke();

  // mitten helper (vẽ găng “tim” giống hình 2)
  const mitten = (x: number, y: number, flip: 1 | -1, rot: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.translate(-x, -y);

    // phần đỏ
    ctx.fillStyle = "rgba(220,40,50,0.96)";
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1.4 * s;

    ctx.beginPath();
    ctx.ellipse(x, y, 10.5 * s, 9.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ngón cái (nhô ra)
    ctx.beginPath();
    ctx.ellipse(x + flip * 7 * s, y + 2.5 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // cuff trắng
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    roundRectPath(ctx, x - 9 * s, y + 6.5 * s, 18 * s, 8.5 * s, 6 * s);
    ctx.fill();

    ctx.restore();
  };

  mitten(endLX, endLY, -1, ang);
  mitten(endRX, endRY, 1, ang);

  // ===== Santa hat (neo theo headTopY, không lệch) =====
  // brim
  const brimW = rHead * 1.65;
  const brimH = rHead * 0.34;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRectPath(
    ctx,
    cx - brimW / 2,
    headTopY + rHead * 0.48,
    brimW,
    brimH,
    10 * s
  );
  ctx.fill();

  // cap đỏ (đỉnh nón)
  ctx.fillStyle = "rgba(220,40,50,0.96)";
  ctx.beginPath();
  ctx.moveTo(cx - rHead * 0.8, headTopY + rHead * 0.56);
  ctx.quadraticCurveTo(
    cx - rHead * 0.2,
    headTopY - rHead * 0.65,
    cx + rHead * 0.95,
    headTopY + rHead * 0.34
  );
  ctx.quadraticCurveTo(
    cx + rHead * 0.3,
    headTopY + rHead * 0.78,
    cx - rHead * 0.8,
    headTopY + rHead * 0.56
  );
  ctx.closePath();
  ctx.fill();

  // pompom (bên trái)
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(cx - rHead * 0.98, headTopY + rHead * 0.62, 9 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export default function SnowCanvas({
  className,
  buildSnowmanAfterMs = 6500,
  density = 1,
}: SnowCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    // --- sizing ---
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * DPR);
      canvas.height = Math.floor(rect.height * DPR);
    };
    resize();
    window.addEventListener("resize", resize);

    // --- simulation params ---
    const rand = (min: number, max: number) =>
      min + Math.random() * (max - min);

    const makeFlake = (w: number, h: number): Flake => ({
      x: rand(0, w),
      y: rand(-h, 0),
      vx: rand(-0.35, 0.35) * DPR,
      vy: rand(0.75, 1.8) * DPR,
      r: rand(0.8, 2.2) * DPR,
      a: rand(0.55, 0.95),
    });

    // Downsample ground columns để nhẹ máy
    const getCols = (w: number) => Math.max(180, Math.floor(w / 3)); // càng lớn càng mịn
    let cols = getCols(canvas.width);
    let ground = new Float32Array(cols); // height per column (px)
    let totalSettled = 0;

    const initWorld = () => {
      cols = getCols(canvas.width);
      ground = new Float32Array(cols);
      totalSettled = 0;
    };
    initWorld();

    const flakeCount = () => {
      const area = canvas.width * canvas.height;
      // số hạt theo diện tích + density
      return clamp(Math.floor((area / 35000) * density), 140, 520);
    };

    let flakes: Flake[] = Array.from({ length: flakeCount() }, () =>
      makeFlake(canvas.width, canvas.height)
    );

    const onHardResize = () => {
      resize();
      initWorld();
      flakes = Array.from({ length: flakeCount() }, () =>
        makeFlake(canvas.width, canvas.height)
      );
    };

    // resize nhẹ: nếu size thay đổi nhiều mới reset
    let lastW = canvas.width;
    let lastH = canvas.height;

    const drawGround = (w: number, h: number) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < cols; i++) {
        const x = (i / (cols - 1)) * w;
        const y = h - ground[i];
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();

      // nền tuyết hơi “glow” công nghệ
      const g = ctx.createLinearGradient(0, h - 160 * DPR, 0, h);
      g.addColorStop(0, "rgba(255,255,255,0.18)");
      g.addColorStop(1, "rgba(255,255,255,0.32)");
      ctx.fillStyle = g;
      ctx.fill();

      // highlight line
      ctx.strokeStyle = "rgba(170,230,255,0.18)";
      ctx.lineWidth = 1 * DPR;
      ctx.stroke();
    };

    const groundAtX = (x: number, w: number) => {
      const idx = clamp(Math.floor((x / w) * cols), 0, cols - 1);
      return { idx, y: canvas.height - ground[idx] };
    };

    // Profile “người tuyết” (3 vòng tròn) -> chiều cao mục tiêu theo cột
    const moundTarget = (w: number, h: number, cx: number) => {
      const target = new Float32Array(cols);

      for (let i = 0; i < cols; i++) {
        const x = (i / (cols - 1)) * w;

        // 1 cái mound mềm (không tạo thân người tuyết)
        const mound =
          18 * DPR +
          28 * DPR * Math.exp(-Math.pow((x - cx) / (240 * DPR), 2)) +
          10 * DPR * Math.exp(-Math.pow((x - cx) / (120 * DPR), 2));

        target[i] = clamp(mound, 0, h * 0.25);
      }

      return target;
    };

    let start = performance.now();
    let built = false;

    const loop = (now: number) => {
      if (!running) return;

      const w = canvas.width;
      const h = canvas.height;

      // nếu resize nhiều: reset
      if (Math.abs(w - lastW) > 20 || Math.abs(h - lastH) > 20) {
        lastW = w;
        lastH = h;
        onHardResize();
      }

      ctx.clearRect(0, 0, w, h);

      // --- update flakes ---
      for (const f of flakes) {
        f.x += f.vx;
        f.y += f.vy;

        // gió nhẹ theo thời gian
        f.x += Math.sin(now / 900 + f.y / 120) * 0.22 * DPR;

        // wrap ngang
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        // collide ground
        const g = groundAtX(f.x, w);
        if (f.y + f.r >= g.y) {
          // settle vào ground
          const add = 0.55 * f.r; // độ “đọng”
          ground[g.idx] = Math.min(h * 0.62, ground[g.idx] + add);
          totalSettled += add;

          // respawn
          f.x = rand(0, w);
          f.y = rand(-h * 0.2, 0);
          f.vx = rand(-0.35, 0.35) * DPR;
          f.vy = rand(0.8, 1.9) * DPR;
          f.r = rand(0.8, 2.2) * DPR;
          f.a = rand(0.55, 0.95);
        }
      }

      // --- morph to snowman after time or enough snow ---
      const elapsed = now - start;
      const enough = totalSettled > w * 18 * DPR; // threshold tương đối
      const shouldBuild = elapsed > buildSnowmanAfterMs || enough;

      if (shouldBuild) {
        const cx = w * 0.28; // vị trí người tuyết
        const target = moundTarget(w, h, cx); //  chỉ tạo mound nền

        const k = built ? 0.08 : 0.045; // làm mịn nhanh hơn chút
        for (let i = 0; i < cols; i++) {
          ground[i] = ground[i] + (target[i] - ground[i]) * k;
        }

        built = true;
      } else {
        // smooth ground nhẹ
        for (let i = 1; i < cols - 1; i++) {
          ground[i] = (ground[i - 1] + ground[i] * 2 + ground[i + 1]) / 4;
        }
      }

      // --- draw ground ---
      drawGround(w, h);

      // --- snowman (trước) ---
      if (built) {
        const cx = w * 0.28;
        const baseY = h - 26 * DPR;
        const s = 0.9; //  KHÔNG nhân DPR nữa để khỏi phình
        drawCuteSnowman(ctx, cx, baseY, s);
      }

      // --- draw flakes (đè lên snowman) ---
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const f of flakes) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${f.a})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();

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
      window.removeEventListener("resize", resize);
    };
  }, [buildSnowmanAfterMs, density]);

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
