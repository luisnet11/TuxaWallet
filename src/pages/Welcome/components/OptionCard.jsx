export default function OptionCard({ icon, title, description, badge, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className="group flex w-full items-center gap-4 rounded-box border border-base-300 bg-base-100 p-4 text-left transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-primary/60 enabled:hover:bg-primary/10 enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-enabled:group-hover:bg-primary group-enabled:group-hover:text-primary-content">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{title}</span>
          {badge && <span className="badge badge-secondary badge-sm badge-soft">{badge}</span>}
        </span>
        <span className="text-sm text-base-content/60 text-pretty">{description}</span>
      </span>
      {!disabled && (
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-base-content/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </button>
  );
}
