/** Pulsing placeholder blocks for list loading states */
export function DoctorsGridSkeleton({ count = 4 }) {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
        >
          <div className="h-6 w-3/4 max-w-[12rem] rounded-md bg-slate-200" />
          <div className="mt-3 h-4 w-1/2 max-w-[8rem] rounded-md bg-slate-200" />
          <div className="mt-4 h-4 w-24 rounded-md bg-slate-100" />
        </li>
      ))}
    </ul>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="max-w-2xl animate-pulse" aria-hidden>
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="h-8 w-2/3 max-w-md rounded-lg bg-slate-200" />
        <div className="mt-4 h-5 w-40 rounded-lg bg-slate-200" />
        <div className="mt-6 h-20 w-full rounded-lg bg-slate-100" />
        <div className="mt-6 h-10 w-40 rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4 }) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="animate-pulse space-y-0 divide-y divide-slate-100" aria-hidden>
        <div className="flex gap-4 bg-slate-50 px-4 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 flex-1 rounded bg-slate-200" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
