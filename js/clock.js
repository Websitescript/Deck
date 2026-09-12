function startClock() {
  const el = document.getElementById("term-clock");
  if (!el) return;

  function tick() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    el.textContent = `${h}:${m}:${s} ${period}`;
  }

  tick();
  setInterval(tick, 1000);
}
