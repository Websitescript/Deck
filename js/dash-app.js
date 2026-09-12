document.addEventListener("DOMContentLoaded", async () => {
  startClock();
  wireWindowControls();
  initDashboardInteractions();
  await loadAppData();
  renderDashboard();
  checkReminders();
});
