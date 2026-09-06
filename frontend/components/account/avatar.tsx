import Image from "next/image";
import { initialsOf } from "@/components/account/initials";
import { cn } from "@/lib/utils";

/**
 * Avatar pengguna — satu komponen untuk navbar dan halaman profil.
 *
 * Sebelum ini keduanya menggambar hal yang berbeda: halaman profil memuat
 * `avatar_url` sebagai gambar, sedangkan menu di navbar selalu menggambar
 * inisial sendiri karena sengaja tidak mau menembak `/api/auth/me` demi
 * kecepatan header. Hasilnya satu orang punya dua wajah di aplikasi yang sama.
 *
 * Yang menyatukannya: `avatar_url` bawaan akun bukan foto sungguhan, melainkan
 * inisial yang digambar ui-avatars.com — persis informasi yang sama dengan
 * yang bisa digambar sendiri di sini, hanya lewat satu permintaan jaringan dan
 * dengan warna latar acak yang berubah tiap kali dimuat. Jadi url semacam itu
 * diperlakukan sebagai "belum ada foto", dan inisialnya digambar lokal.
 *
 * Foto sungguhan yang diunggah ke Storage tetap ditampilkan apa adanya, jadi
 * ini tidak menutup jalan buat fitur unggah foto profil nanti.
 */

/** Host yang membuatkan gambar inisial, bukan menyimpan foto asli. */
const GENERATED_AVATAR_HOSTS = ["ui-avatars.com"];

function isGeneratedAvatar(url: string) {
  try {
    return GENERATED_AVATAR_HOSTS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function Avatar({
  name,
  src,
  pixels,
  className,
}: {
  name: string;
  /** `avatar_url` dari profil; null untuk pengguna tanpa foto. */
  src?: string | null;
  /** Ukuran render gambar, dalam piksel. Samakan dengan lebar di className. */
  pixels: number;
  /** Ukuran dan tipografi — mis. `"h-9 w-9 text-xs"`. */
  className?: string;
}) {
  const photo = src && !isGeneratedAvatar(src) ? src : null;

  if (photo) {
    return (
      <Image
        src={photo}
        alt=""
        width={pixels}
        height={pixels}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-brand-700 font-bold text-white",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
