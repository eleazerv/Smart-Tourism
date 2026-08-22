import { API_BASE_URL } from "@/lib/api";

/**
 * Shown in place of a section whose API call failed, so one unreachable
 * endpoint degrades a single rail instead of taking down the whole page.
 */
export function LoadError({ what }: { what: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {what} belum bisa dimuat. Pastikan API di {API_BASE_URL} sedang berjalan.
    </p>
  );
}
