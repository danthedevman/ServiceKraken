/** Apply the saved appearance before the page paints; storage may be disabled. */
(() => {
  let theme;
  try {
    theme = localStorage.getItem('servicekraken-theme');
  } catch {
    /* Use device preference. */
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.backgroundColor = theme === 'dark' ? '#020617' : '#f7f9fa';
  document.documentElement.style.colorScheme = theme;
})();
