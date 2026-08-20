import Link from "next/link";

export function AwardsBanner() {
  return (
    <section className="bg-brand-900 text-brand-50">
      <div className="container-page py-14 sm:py-20">
        <div className="max-w-2xl">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 font-display text-xs font-bold text-brand-900">
            2026
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Penghargaan Pilihan Traveler Terbaik dari yang Terbaik
          </h2>
          <p className="mt-4 text-sm text-brand-50/80 sm:text-base">
            Semua destinasi, tempat menginap, tempat makan, dan pengalaman
            terbaik kami &mdash; ditentukan oleh Anda.
          </p>
          <Link
            href="/awards"
            className="mt-8 inline-flex rounded-full bg-brand-100 px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
          >
            Lihat pemenangnya
          </Link>
        </div>
      </div>
    </section>
  );
}
