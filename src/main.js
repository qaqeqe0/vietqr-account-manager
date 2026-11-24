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

// ── Popup search: a button at the end of the filter row opens the search box. "/" or simply
// starting to type also opens it (the typed key lands in the box). Esc on an empty box, the
// close button, or the search button again closes it and clears the query.
const searchInput = document.getElementById('searchInput');
const searchToggle = document.getElementById('btnSearchToggle');
const isPopup = !document.body.classList.contains('tab-view');
const searchIsOpen = () => document.body.classList.contains('search-open');

function openSearch() {
  document.body.classList.add('search-open');
  searchToggle.setAttribute('aria-expanded', 'true');
  searchInput.focus();
}
function closeSearch() {
  document.body.classList.remove('search-open');
  searchToggle.setAttribute('aria-expanded', 'false');
  if (searchInput.value) {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true })); // shared app re-renders the list
  }
  searchToggle.focus();
}

if (isPopup) {
  searchToggle.addEventListener('click', () => (searchIsOpen() ? closeSearch() : openSearch()));
  document.getElementById('btnSearchClose').addEventListener('click', closeSearch);
  // The shared app clears a non-empty box on Esc (and marks the event handled); a second Esc closes.
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented && !searchInput.value) { event.preventDefault(); closeSearch(); }
  });
  // Capture phase, so this runs before the shared "/" shortcut tries to focus a hidden box.
  document.addEventListener('keydown', (event) => {
    if (searchIsOpen() || document.querySelector('.backdrop')) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && event.key !== ' ';
    if (event.key === '/' || printable) {
      if (event.key === '/') event.preventDefault();
      openSearch();
    }
  }, true);
}

// ── Filter row: show ‹ › only when the chips overflow, fade the clipped edge, scroll by most of
// a screen per click, and keep the selected chip in view after the shared app re-renders it.
const chips = document.getElementById('groupChips');
const chipsPrev = document.getElementById('chipsPrev');
const chipsNext = document.getElementById('chipsNext');
function updateChipArrows() {
  const max = chips.scrollWidth - chips.clientWidth;
  const left = chips.scrollLeft > 2;
  const right = max - chips.scrollLeft > 2;
  chipsPrev.hidden = !left;
  chipsNext.hidden = !right;
  chips.classList.toggle('more-left', left);
  chips.classList.toggle('more-right', right);
}
const scrollChips = (direction) => chips.scrollBy({ left: direction * chips.clientWidth * 0.7, behavior: 'smooth' });
chipsPrev.addEventListener('click', () => scrollChips(-1));
chipsNext.addEventListener('click', () => scrollChips(1));
// The shared app rebuilds the chips on every keystroke, which resets the strip to the start;
// put it back where the user left it unless a different chip became the selected one.
let savedLeft = 0;
chips.addEventListener('scroll', () => { savedLeft = chips.scrollLeft; updateChipArrows(); }, { passive: true });
let lastActive = null;
new MutationObserver(() => {
  const active = chips.querySelector('.chip.active');
  const label = active?.firstChild?.textContent ?? active?.textContent ?? null;
  if (active && label !== lastActive && lastActive !== null) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  else chips.scrollTo({ left: savedLeft, behavior: 'instant' });
  lastActive = label;
  requestAnimationFrame(updateChipArrows);
}).observe(chips, { childList: true });
new ResizeObserver(updateChipArrows).observe(chips);
updateChipArrows();
