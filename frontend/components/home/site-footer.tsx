import Link from "next/link";
import { footerColumns } from "@/lib/home-data";
import { Logo } from "@/components/home/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted">
      <div className="container-page py-12">
        {/* Brand block carries the identity; links stay grouped on the right
            so the row reads as two blocks instead of four stray columns. */}
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Platform pengelolaan kunjungan wisata berbasis data untuk mencegah
              overtourism di destinasi Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-5 md:col-start-8">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/80 underline-offset-4 transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-100"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              &copy; 2026 Smart Tourism. Seluruh hak cipta dilindungi.
            </p>
            <p className="text-xs text-muted-foreground">
              Sumber data: BPS, BMKG, dan pencatatan pengelola destinasi.
              Prediksi kepadatan bersifat estimasi.
            </p>
          </div>
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}
