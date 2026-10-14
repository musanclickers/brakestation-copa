export function AdminBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top right, rgba(58,99,168,0.18), transparent 70%), radial-gradient(ellipse at bottom left, rgba(227,33,37,0.08), transparent 75%)',
        }}
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
