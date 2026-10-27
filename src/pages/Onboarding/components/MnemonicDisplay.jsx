import { useState } from 'react';

export default function MnemonicDisplay({ mnemonic, onContinue }) {
  const [confirmed, setConfirmed] = useState(false);
  const words = mnemonic.trim().split(/\s+/);

  return (
    <section className="flex flex-col gap-5" aria-labelledby="mnemonic-title">
      <div>
        <h2 id="mnemonic-title" className="text-xl font-semibold">
          Tu frase de recuperación
        </h2>
        <p className="mt-1 text-sm text-base-content/70 leading-relaxed">
          Escribe estas {words.length} palabras en papel, en orden, y guárdalas en un lugar seguro.
          Es la única forma de recuperar tu billetera.
        </p>
      </div>

      <div role="alert" className="alert alert-warning alert-soft text-sm">
        <span>
          Nunca compartas esta frase. Nadie de Tuxachain te la pedirá jamás.
        </span>
      </div>

      <ol className="grid grid-cols-3 gap-2 rounded-box border border-warning/40 bg-warning/10 p-3 font-mono text-sm">
        {words.map((word, i) => (
          <li
            key={`${i}-${word}`}
            className="flex items-center gap-1.5 rounded-field bg-base-100/70 px-2 py-1.5"
          >
            <span className="w-5 text-right text-xs text-warning/80">{i + 1}</span>
            <span className="truncate text-base-content">{word}</span>
          </li>
        ))}
      </ol>

      <label className="flex cursor-pointer items-start gap-3 rounded-box bg-base-200 p-4">
        <input
          type="checkbox"
          className="checkbox checkbox-primary mt-0.5"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        <span className="text-sm leading-relaxed">
          He guardado mis palabras en un lugar seguro y entiendo que no podré recuperarlas.
        </span>
      </label>

      <button
        type="button"
        className="btn btn-primary btn-lg btn-block"
        disabled={!confirmed}
        onClick={onContinue}
      >
        Continuar al Dashboard
      </button>
    </section>
  );
}
