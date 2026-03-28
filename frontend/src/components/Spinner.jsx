export default function Spinner({ className = '' }) {
  return (
    <div
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-brand-500 border-r-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
