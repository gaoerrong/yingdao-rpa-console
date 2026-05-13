export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        bg: 'oklch(99% 0.002 240)',
        surface: '#ffffff',
        fg: 'oklch(18% 0.012 250)',
        muted: 'oklch(54% 0.012 250)',
        border: 'oklch(92% 0.005 250)',
        accent: {
          DEFAULT: 'oklch(58% 0.18 255)',
          light: 'oklch(96% 0.04 255)',
        },
        status: {
          ok: '#22c55e',
          run: '#3b82f6',
          err: '#ef4444',
          warn: '#f59e0b',
          off: '#9ca3af',
        },
        role: {
          sa: '#5b21b6',
        },
      },
      borderRadius: {
        DEFAULT: '5px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"PingFang SC"',
          '"Helvetica Neue"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['"SF Mono"', '"Consolas"', '"Menlo"', 'monospace'],
      },
    },
  },
}
