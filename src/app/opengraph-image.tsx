import { ImageResponse } from "next/og";

export const alt = "GestorPro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: "#0a2530",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 220,
            height: 220,
            borderRadius: 48,
            background: "#0a2530",
            border: "4px solid #15424a",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Mesmo desenho do public/icon.svg (anel aberto + ponto) */}
          <svg width="160" height="160" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="32"
              fill="none"
              stroke="#2ee6c5"
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray="167.55 33.51"
            />
            <circle cx="82" cy="50" r="8" fill="#1d6a70" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#f3f7f6" }}>GestorPro</div>
        <div style={{ display: "flex", fontSize: 32, color: "#8fb3ae" }}>
          Gestão de clientes, vendas e estoque pra revenda de streaming
        </div>
      </div>
    ),
    { ...size }
  );
}
