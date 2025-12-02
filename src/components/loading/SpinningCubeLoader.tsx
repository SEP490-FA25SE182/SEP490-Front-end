"use client"

import { useAnimationFrame } from "motion/react"
import { useRef } from "react"

export default function SpinningCubeLoader() {
  const ref = useRef<HTMLDivElement>(null)

  useAnimationFrame((t) => {
    if (!ref.current) return

    const rotate = Math.sin(t / 10000) * 200
    const y = (1 + Math.sin(t / 1000)) * -50
    ref.current.style.transform = `translateY(${y}px) rotateX(${rotate}deg) rotateY(${rotate}deg)`
  })

  return (
    <div className="loader-wrapper">
      <div className="container">
        <div className="cube" ref={ref}>
          <div className="side front" />
          <div className="side left" />
          <div className="side right" />
          <div className="side top" />
          <div className="side bottom" />
          <div className="side back" />
        </div>
      </div>
      <StyleSheet />
    </div>
  )
}

/**
 * ==============   Styles   ================
 */
function StyleSheet() {
  return (
    <style>{`
      .loader-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px 0;
      }

      .container {
        perspective: 800px;
        width: 200px;
        height: 200px;
      }

      .cube {
        width: 200px;
        height: 200px;
        position: relative;
        transform-style: preserve-3d;
      }

      .side {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: red;
        opacity: 0.6;
      }

      .front {
        transform: rotateY(0deg) translateZ(100px);
        background-color: var(--hue-1-transparent, #ff4d4f55);
      }
      .right {
        transform: rotateY(90deg) translateZ(100px);
        background-color: var(--hue-2-transparent, #40a9ff55);
      }
      .back {
        transform: rotateY(180deg) translateZ(100px);
        background-color: var(--hue-3-transparent, #73d13d55);
      }
      .left {
        transform: rotateY(-90deg) translateZ(100px);
        background-color: var(--hue-4-transparent, #faad1455);
      }
      .top {
        transform: rotateX(90deg) translateZ(100px);
        background-color: var(--hue-5-transparent, #9254de55);
      }
      .bottom {
        transform: rotateX(-90deg) translateZ(100px);
        background-color: var(--hue-6-transparent, #13c2c255);
      }
    `}</style>
  )
}
