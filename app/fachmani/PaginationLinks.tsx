import Link from "next/link";

type Props = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

// SSR varianta paginace — buduje URL místo callback. Slouží i jako craws-friendly link síť pro SEO.
export default function PaginationLinks({ currentPage, totalPages, buildHref }: Props) {
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

  const PrevLink = currentPage === 1
    ? <span className="px-3 py-2 rounded-xl text-sm font-medium opacity-30 cursor-not-allowed text-gray-600">← Předchozí</span>
    : <Link href={buildHref(currentPage - 1)} className="px-3 py-2 rounded-xl text-sm font-medium transition-all text-gray-600 hover:bg-gray-100">← Předchozí</Link>;

  const NextLink = currentPage === totalPages
    ? <span className="px-3 py-2 rounded-xl text-sm font-medium opacity-30 cursor-not-allowed text-gray-600">Další →</span>
    : <Link href={buildHref(currentPage + 1)} className="px-3 py-2 rounded-xl text-sm font-medium transition-all text-gray-600 hover:bg-gray-100">Další →</Link>;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {PrevLink}
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${
              currentPage === page
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {page}
          </Link>
        ),
      )}
      {NextLink}
    </div>
  );
}
