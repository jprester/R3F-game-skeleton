export default function UI() {
  const isQaMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("qa") === "1";

  if (isQaMode) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        color: "white",
        fontFamily: "monospace",
        fontSize: 13,
        lineHeight: 1.55,
        background: "rgba(0, 0, 0, 0.42)",
        padding: "12px 14px",
        borderRadius: 6,
        pointerEvents: "none",
      }}>
      <strong>Ocean Walk Camera</strong>
      <div>Click to capture mouse</div>
      <div>WASD / arrows move</div>
      <div>Space jumps</div>
      <div>Esc releases mouse</div>
    </div>
  );
}
