import Navbar from "@/app/components/Navbar";

// Detail fachmana je server component (SSR) — Next.js streamuje tenhle skeleton
// dokud server doběhne Promise.all(profile, kategorie, recenze, promo, RPC).
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-5 w-32 animate-pulse rounded bg-gray-200" />

        {/* Hero karta */}
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-100 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <div className="h-28 w-28 flex-shrink-0 animate-pulse rounded-3xl bg-gray-100" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="flex flex-wrap gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
                <div className="h-6 w-28 animate-pulse rounded-full bg-gray-100" />
              </div>
              <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-12 animate-pulse rounded-2xl bg-gradient-to-r from-cyan-100 to-blue-100" />
            <div className="h-12 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>

        {/* O fachmanovi */}
        <div className="mt-5 rounded-3xl bg-white p-6 ring-1 ring-gray-100">
          <div className="mb-3 h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          </div>
        </div>

        {/* Recenze */}
        <div className="mt-5 rounded-3xl bg-white p-6 ring-1 ring-gray-100">
          <div className="mb-4 h-5 w-24 animate-pulse rounded bg-gray-200" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="mb-3 border-b border-gray-100 pb-3 last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
                <div className="space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-100" />
              <div className="mt-1 h-3 w-4/5 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
