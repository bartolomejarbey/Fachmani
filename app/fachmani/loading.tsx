import Navbar from "@/app/components/Navbar";

// Vnímaná latence: skeleton se streamuje okamžitě, real RSC dotečou až za ~400-700 ms.
// Strukturou napodobuje cílový layout (Filtry vlevo, mřížka karet vpravo) — eliminuje CLS.
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="mb-8 h-5 w-96 animate-pulse rounded-md bg-gray-100" />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filter sidebar skeleton */}
          <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>

          {/* Card grid skeleton — 12 karet jako v PAGE_SIZE */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100"
              >
                <div className="h-32 w-full animate-pulse bg-gray-100" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
                    <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
