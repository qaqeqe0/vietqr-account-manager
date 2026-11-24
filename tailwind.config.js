// Tailwind scans this project's markup/view code and the shared logic modules, whose
// class names (btn, field-input, qr-sheet…) are styled in src/styles/app.css.
export default {
  content: ['./popup.html', './options.html', './src/**/*.js', '../vietqr-account-manager-extension/src/**/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
};
