"use client";

/**
 * Kolom percakapan: gelembung pesan, kartu pilihan, dan komposer.
 *
 * Satu giliran bisa memanggil beberapa tool katalog berturut-turut, jadi
 * belasan detik itu wajar. Indikator menunggunya menghitung detik supaya
 * diamnya layar bisa dibedakan dari aplikasi yang menggantung.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveCards } from "@/components/planner/interactive-cards";
import type {
  ChatMessage,
  PlannerFlightOption,
  TripCanvas,
  TripFlightRole,
} from "@/lib/api";

type Props = {
  messages: ChatMessage[];
  canvas: TripCanvas | null;
  sending: boolean;
  /**
   * Kotak tulisnya tidak pernah dikunci karena belum ada percakapan: pesan
   * pertama yang membuat ruangnya. Satu-satunya yang mengunci adalah giliran
   * yang sedang diproses.
   */
  onSend: (message: string) => void;
  onAddDestination: (id: string) => Promise<void>;
  onPickAccommodation: (
    stopId: string,
    accommodationId: string,
  ) => Promise<void>;
  onPickFlight: (
    option: PlannerFlightOption,
    stopId: string,
    role: TripFlightRole,
  ) => Promise<void>;
};

export function ChatColumn({
  messages,
  canvas,
  sending,
  onSend,
  onAddDestination,
  onPickAccommodation,
  onPickFlight,
}: Props) {
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, sending]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && !sending && <EmptyState />}

          {messages.map((m) => (
            <div key={m.id}>
              <div
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={
                    m.role === "user"
                      ? // Putih, bukan --primary-foreground: di mode terang
                        // nilainya biru pucat dan terbaca kotor di atas hijau
                        // tua. Mode gelap tetap memakai tinta gelapnya karena
                        // di sana gelembungnya justru berwarna terang.
                        "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-white dark:text-primary-foreground"
                      : "max-w-[95%] rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2 text-sm"
                  }
                >
                  {m.role === "assistant" ? (
                    <MarkdownLite text={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>

              {m.role === "assistant" && (
                <>
                  <ProvenanceNote
                    toolsUsed={m.tools_used}
                    content={m.content}
                  />
                  <InteractiveCards
                    blocks={m.interactive ?? []}
                    canvas={canvas}
                    onAddDestination={onAddDestination}
                    onPickAccommodation={onPickAccommodation}
                    onPickFlight={onPickFlight}
                  />
                  <SourceNote toolsUsed={m.tools_used} />
                </>
              )}
            </div>
          ))}

          {sending && <Thinking />}
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            rows={1}
            value={text}
            disabled={sending}
            placeholder="Ceritakan rencana liburanmu..."
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button
            size="icon"
            className="shrink-0 rounded-full"
            aria-label="Kirim pesan"
            disabled={sending || !text.trim()}
            onClick={submit}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-10 text-center">
      <h2 className="font-display text-xl font-bold tracking-tight">
        Ceritakan liburan yang kamu bayangkan
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Sebutkan suasana yang kamu cari, berapa lama, dan dari kota mana kamu
        berangkat. Aku carikan tempatnya dan susun di panel sebelah — kamu tetap
        yang memutuskan apa yang jadi dipilih.
      </p>
    </div>
  );
}

function Thinking() {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {secs < 6
        ? "mencari data"
        : secs < 15
          ? "menyusun jawaban"
          : "masih memproses"}{" "}
      · {secs}s
    </div>
  );
}

/**
 * Nama tool internal tidak berarti apa-apa bagi pengguna — melihat
 * "search_destinations" menempel di bawah jawaban cuma bikin bingung. Yang
 * sebenarnya ingin disampaikan adalah dari mana isi jawaban itu diambil, jadi
 * tiap tool diterjemahkan ke sumber datanya, dan yang tidak punya terjemahan
 * (tool internal seperti hitung rute) sengaja tidak ditampilkan.
 */
const SOURCE_LABEL: Record<string, string> = {
  search_destinations: "katalog destinasi",
  get_destination_detail: "katalog destinasi",
  search_accommodations: "katalog penginapan",
  get_accommodation_detail: "katalog penginapan",
  search_flights_by_date: "jadwal penerbangan",
  get_flight_calendar: "jadwal penerbangan",
  get_seasonal_recommendations: "rekomendasi musiman",
  get_my_recommendations: "preferensimu",
  get_events: "kalender acara",
  estimate_budget: "hitungan biaya",
  list_cities: "daftar kota",
};

function SourceNote({ toolsUsed }: { toolsUsed?: string[] }) {
  if (!toolsUsed?.length) return null;

  const sources = [...new Set(toolsUsed.map((t) => SOURCE_LABEL[t]).filter(Boolean))];
  if (sources.length === 0) return null;

  return (
    <p className="mt-2 text-[11px] text-muted-foreground">
      Diambil dari {sources.join(", ")}.
    </p>
  );
}

/**
 * Kalau sebuah balasan tidak memakai tool sama sekali padahal menyebut tempat
 * atau harga, isinya datang dari pengetahuan umum model, bukan katalog. Itu
 * perlu terlihat — pengguna berhak tahu mana yang bisa dipercaya sebagai data.
 */
function ProvenanceNote({
  toolsUsed,
  content,
}: {
  toolsUsed?: string[];
  content: string;
}) {
  if (!Array.isArray(toolsUsed) || toolsUsed.length > 0) return null;

  const mentionsData =
    /rp\s?\d|\d{2,3}\.\d{3}|pantai|hotel|penginapan|penerbangan|maskapai|pukul|\d{2}[.:]\d{2}/i.test(
      content,
    );
  if (!mentionsData) return null;

  return (
    <p className="mt-2 flex max-w-lg items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
      Jawaban ini tidak mengambil data dari katalog. Cek ulang nama tempat dan
      harganya sebelum dipakai.
    </p>
  );
}

/**
 * Model menyusun jawaban dengan **tebal**, heading, dan daftar — itu membantu
 * keterbacaan, jadi ditampilkan sebagai format asli daripada dilarang lewat
 * prompt (yang bikin jawabannya jadi paragraf datar). Ditulis manual karena
 * cuma tiga pola itu yang benar-benar dipakai.
 */
function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];

  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="my-1 list-disc space-y-0.5 pl-5">
          {list}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((line, i) => {
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    if (bullet) {
      list.push(<li key={i}>{inline(bullet[1])}</li>);
      return;
    }
    flush();

    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      blocks.push(
        <p key={i} className="mt-2 font-semibold first:mt-0">
          {inline(heading[1])}
        </p>,
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={i} className="h-1.5" />);
    } else {
      blocks.push(<p key={i}>{inline(line)}</p>);
    }
  });
  flush();

  return <>{blocks}</>;
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}
