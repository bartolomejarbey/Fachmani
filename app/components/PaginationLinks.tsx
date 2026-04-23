import Link from "next/link";

type Props = {
  currentPage: number;
  totalPages: number;
  /** Funkce vracející URL pro danou stránku — volaná v Server Component. */
  hrefForPage: (page: number) => string;
};

export default function PaginationLinks({ currentPage, totalPages, hrefForPage }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Stránkování">
      {currentPage > 1 ? (
        <Link
          href={hrefForPage(currentPage - 1)}
          className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          rel="prev"
        >
          ← Předchozí
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed">
          ← Předchozí
        </span>
      )}

      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={hrefForPage(page)}
            aria-current={currentPage === page ? "page" : undefined}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
              currentPage === page
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={hrefForPage(currentPage + 1)}
          className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
          rel="next"
        >
          Další →
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-xl text-sm font-medium text-gray-300 cursor-not-allowed">
          Další →
        </span>
      )}
    </nav>
  );
}
