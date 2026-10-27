export default function BrandHeader() {
  return (
    <header className="flex flex-col items-center gap-3 pt-10 pb-6 text-center">
      <div className="relative flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30">
        <svg
          viewBox="0 0 24 24"
          className="size-10 text-primary-content"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 10 4.3-1.4 7.5-5.4 7.5-10v-6L12 2.5Z" />
          <path d="m8.75 12 2.25 2.25 4.25-4.5" />
        </svg>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          Tuxa<span className="text-secondary">Wallet</span>
        </h1>
        <p className="mt-1 text-sm text-base-content/60">
          La billetera oficial de Tuxachain
        </p>
      </div>
    </header>
  );
}
