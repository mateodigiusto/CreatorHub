export function Aurora() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute"
        style={{
          top: -160,
          right: -120,
          width: 720,
          height: 520,
          borderRadius: "50%",
          filter: "blur(80px)",
          background:
            "radial-gradient(circle, var(--aurora-blue), transparent 70%)",
          animation: "drift1 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: -180,
          left: -140,
          width: 620,
          height: 460,
          borderRadius: "50%",
          filter: "blur(80px)",
          background:
            "radial-gradient(circle, var(--aurora-indigo), transparent 70%)",
          animation: "drift2 28s ease-in-out infinite",
        }}
      />
      <div
        className="absolute"
        style={{
          top: "42%",
          left: "55%",
          width: 380,
          height: 380,
          borderRadius: "50%",
          filter: "blur(90px)",
          background:
            "radial-gradient(circle, var(--aurora-cyan), transparent 70%)",
          animation: "drift3 22s ease-in-out infinite",
        }}
      />
    </div>
  );
}
