export default function ErrorAlert({ messages }) {
  const list = Array.isArray(messages) ? messages.filter(Boolean) : [messages].filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div role="alert" className="alert alert-error alert-soft items-start">
      <svg
        viewBox="0 0 24 24"
        className="size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </svg>
      {list.length === 1 ? (
        <span>{list[0]}</span>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {list.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
