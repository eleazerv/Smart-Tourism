import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: LayoutProps["params"];
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accountArea" });
  return {
    // Re-declared here: a plain string title on this layout otherwise stops the
    // root template from reaching /akun/minat and /akun/kata-sandi.
    title: { default: t("title"), template: "%s | Jelantara" },
    description: t("description"),
    robots: { index: false, follow: false },
  };
}

export default async function AccountLayout({
  children,
  params,
}: LayoutProps) {
  // Wajib di setiap layout dan halaman di bawah `[locale]`: tanpa ini
  // next-intl membaca bahasa dari header saat render, dan Cache Components
  // menolaknya sebagai data runtime di dalam cangkang yang mau di-prerender.
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container-page grid gap-8 py-8 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10 md:py-10">
          <div className="min-w-0">
            <Suspense fallback={<SidebarSkeleton />}>
              <AccountSidebar />
            </Suspense>
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="hidden items-center gap-3 md:flex">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex gap-1 md:flex-col">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-10 w-36 animate-pulse rounded-full bg-muted md:w-full md:rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}
