/* Match the browser/device before paint; manual toggles last for this visit. */
(() => {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let override = null;

  function apply() {
    const dark = override ?? system.matches;
    root.dataset.theme = dark ? 'dark' : 'light';
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }
  apply();
  system.addEventListener('change', () => {
    override = null;
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const dark = root.dataset.theme !== 'dark';
      override = dark === system.matches ? null : dark;
      apply();
    });
  }, { once: true });
})();
