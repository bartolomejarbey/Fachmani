import Navbar from "@/app/components/Navbar";

// Stránka je client component s useEffect — Next.js přesto využije tenhle skeleton
// dokud bundle nedoběhne / first render neproběhne. Match k layoutu detailu poptávky.
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 h-5 w-32 animate-pulse rounded bg-gray-200" />

        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-100 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-2xl bg-gray-100" />
            <div className="flex-1 space-y-3">
              <div className="h-7 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="flex gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-gray-100" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-5 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Offers skeleton */}
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-gray-100">
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200" />
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="mb-3 flex items-center gap-3 rounded-2xl border border-gray-100 p-4"
            >
              <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
