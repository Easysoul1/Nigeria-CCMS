export function ScalesMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M60 18v78" />
      <path d="M34 96h52" />
      <path d="M24 36h72" />
      <circle cx="60" cy="24" r="6" />
      <path d="M24 36 8 70h32L24 36Z" />
      <path d="M96 36 80 70h32L96 36Z" />
      <path d="M8 70c0 7 7 12 16 12s16-5 16-12" />
      <path d="M80 70c0 7 7 12 16 12s16-5 16-12" />
    </svg>
  );
}
