import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          foreground: "var(--surface-page)",
        },
        accent: {
          large: "var(--accent-large)",
        },
        surface: {
          page: "var(--surface-page)",
          raised: "var(--surface-raised)",
          subtle: "var(--surface-subtle)",
          tint: "var(--surface-tint)",
        },
        input: "var(--border-default)",
        border: "var(--border-default)",
        foreground: "var(--text-primary)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        status: {
          pending: {
            DEFAULT: "var(--status-pending-fg)",
            fg: "var(--status-pending-fg)",
            bg: "var(--status-pending-bg)",
          },
          approved: {
            DEFAULT: "var(--status-approved-fg)",
            fg: "var(--status-approved-fg)",
            bg: "var(--status-approved-bg)",
          },
          rejected: {
            DEFAULT: "var(--status-rejected-fg)",
            fg: "var(--status-rejected-fg)",
            bg: "var(--status-rejected-bg)",
          },
          info: {
            DEFAULT: "var(--status-info-fg)",
            fg: "var(--status-info-fg)",
            bg: "var(--status-info-bg)",
          },
          neutral: {
            DEFAULT: "var(--status-neutral-fg)",
            fg: "var(--status-neutral-fg)",
            bg: "var(--status-neutral-bg)",
          },
        },
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          foreground: "var(--sidebar-text)",
          active: "var(--sidebar-active)",
          muted: "var(--sidebar-muted)",
          subtle: "var(--sidebar-subtle)",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Outfit", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius-md)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        e1: "var(--shadow-e1)",
        e2: "var(--shadow-e2)",
      },
      transitionTimingFunction: {
        "out-strong": "var(--ease-out-strong)",
        "in-out-strong": "var(--ease-in-out-strong)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        enter: "var(--duration-enter)",
      },
      minHeight: {
        target: "var(--target-min)",
      },
      minWidth: {
        target: "var(--target-min)",
      },
    },
  },
  plugins: [],
};
export default config;
