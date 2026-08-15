import { ImageResponse } from "next/og";

export const alt = "CREDREP — reputation-backed forecasting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const bars = [76, 112, 158, 214, 278];

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 78% 30%, #123e35 0%, #082721 36%, #031b18 72%)",
        color: "#f8f3e8",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(215,255,79,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(215,255,79,.25) 1px, transparent 1px)",
          backgroundSize: "90px 90px",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "70%",
          padding: "54px 0 52px 62px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 42,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "5px solid #d7ff4f",
              borderRightColor: "transparent",
              color: "#d7ff4f",
              fontSize: 0,
            }}
          />
          <div style={{ fontSize: 31, fontWeight: 700, letterSpacing: 12 }}>
            CREDREP
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 91,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: -5,
            }}
          >
            <span>BACK YOUR</span>
            <span>WORD.</span>
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              color: "#4ec7b5",
              fontSize: 27,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            ONE X ACCOUNT. ONE WALLET.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "auto",
            padding: "12px 20px",
            borderTop: "2px solid #d7ff4f",
            borderBottom: "2px solid #d7ff4f",
            color: "#d7ff4f",
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: 1,
          }}
        >
          START 100 REP · WIN ABOVE 100 · RECOVER TO 100
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 48,
          bottom: 54,
          height: 330,
          display: "flex",
          alignItems: "flex-end",
          gap: 18,
        }}
      >
        {bars.map((height, index) => (
          <div
            key={height}
            style={{
              width: 42,
              height,
              display: "flex",
              background: `linear-gradient(to top, #315c2c, ${index > 2 ? "#d7ff4f" : "#89a63d"})`,
              borderTop: "2px solid #d7ff4f",
            }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
