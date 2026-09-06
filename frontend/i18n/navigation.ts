import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Pengganti `next/link` dan `next/navigation` yang sadar bahasa: `href="/akun"`
 * otomatis jadi `/en/akun` saat pembaca sedang berbahasa Inggris.
 *
 * Seluruh navigasi internal harus lewat sini. Memakai `next/link` langsung
 * akan melempar pembaca kembali ke versi Indonesia tanpa peringatan apa pun.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
