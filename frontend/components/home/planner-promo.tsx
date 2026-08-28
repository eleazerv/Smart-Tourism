import Link from "next/link";
import { MapPin, MessageSquareText, Sparkles, Ticket } from "lucide-react";

/**
 * Pengumuman fitur Rencana AI di beranda.
 *
 * Sampai sekarang halaman depan sama sekali tidak menyebut planner-nya, jadi
 * satu-satunya jalan masuk cuma tautan di navigasi — mudah terlewat untuk
 * fitur sebesar itu.
 *
 * Alih-alih foto tempelan, panel ini menampilkan potongan percakapan
 * sungguhan: itu yang paling cepat menjelaskan apa fitur ini, karena bentuk
 * chat langsung memberi tahu cara memakainya tanpa perlu dibaca.
 */

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Ceritakan maumu",
    body: "Suasana yang kamu cari, berapa lama, dari kota mana berangkat.",
  },
  {
    icon: MapPin,
    title: "Dicarikan dari katalog",
    body: "Destinasi, penginapan, dan penerbangan yang benar-benar ada — bukan karangan.",
  },
  {
    icon: Ticket,
    title: "Pesan sekaligus",
    body: "Rencana yang sudah lengkap bisa langsung dijadikan pesanan.",
  },
];

export function PlannerPromo() {
  return (
    <section className="container-page py-8 sm:py-10">
      <div className="relative isolate overflow-hidden rounded-3xl bg-brand-900 px-6 py-10 sm:px-10 sm:py-12 dark:bg-brand-700">
        <Ornament />

        <div className="relative grid gap-10 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-brand-100 ring-1 ring-inset ring-white/15">
              <Sparkles className="h-3.5 w-3.5" />
              Baru
            </p>

            <h2 className="mt-4 max-w-xl font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Bingung mau ke mana? Ceritakan saja, biar disusunkan.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-base">
              Rencana AI menyusun perjalananmu dari awal — mencari tempatnya,
              memilihkan penginapan, sampai penerbangannya. Kamu tetap yang
              memutuskan apa yang jadi dipilih.
            </p>

            <ul className="mt-7 grid gap-4 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-brand-100 ring-1 ring-inset ring-white/15"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2.5 text-sm font-semibold text-white">
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/70">
                    {body}
                  </p>
                </li>
              ))}
            </ul>

            <Link
              href="/rencana"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-100"
            >
              <Sparkles className="h-4 w-4" />
              Mulai susun rencana
            </Link>
          </div>

          <ChatPreview />
        </div>
      </div>
    </section>
  );
}

/**
 * Hiasan latar: dua bola cahaya lembut dan kisi titik tipis.
 *
 * Semuanya CSS murni — tidak ada gambar yang diunduh, dan `aria-hidden` supaya
 * pembaca layar tidak mengumumkan apa pun dari sini.
 */
function Ornament() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-brand-tint/25 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brand-100/15 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          color: "white",
        }}
      />
    </div>
  );
}

/**
 * Contoh percakapan, bukan tangkapan layar.
 *
 * Ditulis sebagai markup biasa supaya ikut mengecil di layar sempit, tetap
 * tajam di layar padat, dan tidak ikut basi setiap kali tampilan planner-nya
 * berubah.
 */
function ChatPreview() {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-white px-3.5 py-2 text-xs leading-relaxed text-brand-900">
          Mau liburan pantai 4 hari, berangkat dari Jakarta
        </p>
      </div>

      <div className="mt-2.5 flex justify-start">
        <p className="max-w-[90%] rounded-2xl rounded-bl-sm bg-brand-900/60 px-3.5 py-2 text-xs leading-relaxed text-white/90">
          Belitung paling pas — tiket mulai <strong>Rp550rb</strong>. Ini tiga
          pantai dengan rating tertinggi di sana:
        </p>
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {[
          { name: "Pantai Tanjung Kelayang", rating: "4,8" },
          { name: "Pulau Leebong", rating: "4,5" },
          { name: "Pulau Lengkuas", rating: "4,3" },
        ].map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2"
          >
            <span className="truncate text-xs font-medium text-white">
              {item.name}
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-brand-100">
              ★ {item.rating}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 text-center text-[10px] text-white/50">
        Contoh percakapan
      </p>
    </div>
  );
}
