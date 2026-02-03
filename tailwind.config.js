// FILE: tailwind.config.js  (drop-in)
// Reason: make sure Tailwind generates font utilities and scans your files.
export default {
  content: [
    "./index.html",
    "./**/*.{html,js,ts,jsx,tsx}",   // ensure nested pages are scanned
    "./css/**/*.{css}"               // include your CSS that uses @apply
  ],
  theme: {
    extend: {
      fontFamily: {
        cta: ['Montserrat', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Montserrat', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        headline: ['Bebas Neue', 'Oswald', 'Montserrat', 'sans-serif'],
      },
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-primary-dark)',
        gray: '#CCCCCC',
        black: '#0A0A0A',
        white: '#FFFFFF',
      },
    },
  },
  plugins: [],
};
document.getElementById('sendResultBtn').addEventListener('click', () => {
    const subject = `New Transformation Calculator Request`;

    const body = `
A new client submitted their transformation result:

Current Weight: ${calculatorData.weight} ${calculatorData.unit}
Training Days/Week: ${calculatorData.days}
Goal: ${calculatorData.intensity}

Estimated Weeks: ${document.getElementById('estimatedWeeks').textContent}
Estimated KG Change: ${document.getElementById('estimatedLoss').textContent}
Target Weight: ${document.getElementById('targetWeight').textContent}

Please follow up with the client.
`;

    window.location.href = `mailto:info@thrivefitdxb.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

// Recalculate
document.getElementById('recalculateBtn').addEventListener('click', () => {
    location.reload();
});
