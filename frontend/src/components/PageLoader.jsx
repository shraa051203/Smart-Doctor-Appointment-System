import Spinner from './Spinner';

export default function PageLoader({ message = 'Loading…' }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="!h-10 !w-10" />
      <p className="text-sm text-ink-500">{message}</p>
    </div>
  );
}
