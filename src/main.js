// Entry of the Tailwind version: styles + fonts + icons, then the shared app logic.
// Only the Latin + Vietnamese subsets of Inter and the solid/regular icon sets are bundled.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/vietnamese-400.css';
import '@fontsource/inter/vietnamese-500.css';
import '@fontsource/inter/vietnamese-600.css';
import '@fontsource/inter/vietnamese-700.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import '@fortawesome/fontawesome-free/css/regular.min.css';
import './styles/app.css';
import '@shared/popup-app.js';

// The floating "+" does exactly what the toolbar "Thêm tài khoản" button does.
document.getElementById('btnAddFab').addEventListener('click', () => document.getElementById('btnAdd').click());

// Popup: compact the pinned header while the list is scrolled. Two thresholds (on past
// 40px, off near the top) stop it flickering, since shrinking the header moves the page.
if (!document.body.classList.contains('tab-view')) {
  const onScroll = () => {
    const y = window.scrollY;
    const on = document.body.classList.contains('is-scrolled');
    if (!on && y > 40) document.body.classList.add('is-scrolled');
    else if (on && y < 4) document.body.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}
