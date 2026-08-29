"use client";

/**
 * Ruang kerja perencana: daftar percakapan, kolom chat, dan panel rencana.
 *
 * Satu aturan yang dipegang seluruh berkas ini: canvas tidak pernah ditambal
 * di sisi klien. Setiap endpoint `/api/trips/...` dan setiap giliran chat
 * membalas rencana utuh, dan itulah yang dipasang sebagai state. Jadi tidak
 * ada jalan bagi panel untuk menampilkan sesuatu yang tidak ada di database.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatColumn } from "@/components/planner/chat-column";
import { PlanPanel } from "@/components/planner/plan-panel";
import {
  ApiError,
  addTripItem,
  checkoutTrip,
  createChatRoom,
  getChatRoom,
  listChatRooms,
  removeTripFlight,
  removeTripItem,
  sendChatMessage,
  setTripFlight,
  updateTripItem,
  type ChatMessage,
  type ChatRoom,
  type PlannerFlightOption,
  type TripCanvas,
} from "@/lib/api";
import { getBrowserAccessToken } from "@/lib/api/session-browser";

/** Id sementara untuk pesan pengguna yang belum punya baris di database. */
function draftId() {
  return `draft-${Date.now()}`;
}

export function PlannerWorkspace() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [canvas, setCanvas] = useState<TripCanvas | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Token dibaca sekali lalu dipakai ulang; membacanya di tiap pemanggilan
  // berarti satu round-trip ke Supabase untuk setiap klik.
  const tokenRef = useRef<string | null>(null);
  const auth = useCallback(async () => {
    if (!tokenRef.current) tokenRef.current = await getBrowserAccessToken();
    return { token: tokenRef.current };
  }, []);

  /** Kegagalan API selalu punya pesan dari backend — tampilkan apa adanya. */
  const report = useCallback((err: unknown, fallback: string) => {
    setNotice(err instanceof ApiError ? err.message : fallback);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setRooms(await listChatRooms(await auth()));
      } catch (err) {
        report(err, "Daftar percakapan belum bisa dimuat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth, report]);

  const openRoom = useCallback(
    async (id: string) => {
      setNotice(null);
      setRoomId(id);
      setMessages([]);
      setCanvas(null);
      try {
        const room = await getChatRoom(id, await auth());
        if (!room) {
          setNotice("Percakapan itu sudah tidak ada.");
          setRoomId(null);
          return;
        }
        setTripId(room.room.trip_id);
        setMessages(room.messages);
        setCanvas(room.canvas);
      } catch (err) {
        report(err, "Percakapan itu belum bisa dibuka.");
      }
    },
    [auth, report],
  );

  async function newRoom() {
    setBusy(true);
    try {
      const room = await createChatRoom(await auth());
      setRooms((prev) => [room, ...prev]);
      await openRoom(room.id);
    } catch (err) {
      report(err, "Percakapan baru gagal dibuat.");
    } finally {
      setBusy(false);
    }
  }

  async function send(message: string) {
    if (!roomId) return;
    setNotice(null);

    // Pesan pengguna tampil langsung; balasannya bisa belasan detik lagi.
    const optimistic: ChatMessage = {
      id: draftId(),
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
      tool_name: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const turn = await sendChatMessage(roomId, message, await auth());
      setMessages((prev) => [
        ...prev,
        {
          id: draftId() + "-a",
          role: "assistant",
          content: turn.answer,
          created_at: new Date().toISOString(),
          tool_name: null,
          interactive: turn.interactive,
          tools_used: turn.tools_used,
        },
      ]);
      setCanvas(turn.canvas);

      // Judul ruang diisi backend dari pesan pertama; tarik ulang daftarnya
      // supaya label di sidebar tidak tertinggal "Percakapan baru".
      setRooms(await listChatRooms(await auth()));
    } catch (err) {
      report(err, "Pesan gagal diproses. Coba lagi sebentar lagi.");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  /** Semua aksi rencana berbagi pola yang sama: panggil, pasang canvas baru. */
  const mutate = useCallback(
    async (action: (token: { token: string | null }) => Promise<TripCanvas>, fallback: string) => {
      setNotice(null);
      setBusy(true);
      try {
        setCanvas(await action(await auth()));
      } catch (err) {
        report(err, fallback);
      } finally {
        setBusy(false);
      }
    },
    [auth, report],
  );

  const addDestination = useCallback(
    async (destinationId: string) => {
      if (!tripId) return;
      await mutate(
        (token) => addTripItem(tripId, destinationId, token),
        "Destinasi itu gagal ditambahkan.",
      );
    },
    [mutate, tripId],
  );

  const pickAccommodation = useCallback(
    async (itemId: string, accommodationId: string) => {
      if (!tripId) return;
      await mutate(
        (token) =>
          updateTripItem(tripId, itemId, { accommodation_id: accommodationId }, token),
        "Penginapan itu gagal dipilih.",
      );
    },
    [mutate, tripId],
  );

  const pickFlight = useCallback(
    async (option: PlannerFlightOption, type: "outbound" | "return") => {
      if (!tripId) return;

      // Slot berangkat/pulang cuma satu masing-masing, jadi memilih di slot
      // yang sudah terisi berarti mengganti. Itu wajar (ganti pikiran), tapi
      // harus disadari — bukan terjadi diam-diam.
      const existing = canvas?.flights.find((f) => f.flight_type === type);
      if (existing && !existing.booked_at) {
        const current = existing.flight_options;
        const ok = window.confirm(
          `Slot ${type === "outbound" ? "berangkat" : "pulang"} sudah diisi ${current?.airline} ${current?.flight_number}. Ganti dengan ${option.airline} ${option.flight_number}?`,
        );
        if (!ok) return;
      }

      await mutate(
        (token) =>
          setTripFlight(tripId, { flight_option_id: option.id, flight_type: type }, token),
        "Penerbangan itu gagal dipakai. Kursinya mungkin sudah habis.",
      );
    },
    [canvas, mutate, tripId],
  );

  const patchItem = useCallback(
    async (
      itemId: string,
      patch: {
        status?: "suggested" | "confirmed";
        accommodation_id?: string | null;
        check_in?: string | null;
        check_out?: string | null;
      },
    ) => {
      if (!tripId) return;
      await mutate(
        (token) => updateTripItem(tripId, itemId, patch, token),
        "Perubahan itu gagal disimpan.",
      );
    },
    [mutate, tripId],
  );

  const dropItem = useCallback(
    async (itemId: string) => {
      if (!tripId) return;
      await mutate(
        (token) => removeTripItem(tripId, itemId, token),
        "Destinasi itu gagal dihapus.",
      );
    },
    [mutate, tripId],
  );

  const dropFlight = useCallback(
    async (type: "outbound" | "return") => {
      if (!tripId) return;
      await mutate(
        (token) => removeTripFlight(tripId, type, token),
        "Penerbangan itu gagal dilepas.",
      );
    },
    [mutate, tripId],
  );

  async function checkout() {
    if (!roomId) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await checkoutTrip(roomId, await auth());
      const lines: string[] = [];
      if (result.flight_booking) {
        lines.push(`Penerbangan: ${result.flight_booking.booking_code}`);
      }
      for (const stay of result.accommodation_bookings) {
        lines.push(`${stay.destination}: ${stay.booking_code}`);
      }
      for (const failure of result.errors) {
        lines.push(`Gagal (${failure.kind}): ${failure.message}`);
      }
      setNotice(
        `Checkout selesai — ${lines.join(" · ")}. Pesanan masih pending sampai dibayar; lanjutkan di halaman Pesanan.`,
      );
      await openRoom(roomId);
    } catch (err) {
      report(err, "Checkout gagal. Coba lagi sebentar lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start rounded-full"
            disabled={busy}
            onClick={newRoom}
          >
            <Plus className="h-4 w-4" />
            Rencana baru
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {loading && (
            <p className="px-2 py-3 text-xs text-muted-foreground">Memuat…</p>
          )}
          {!loading && rooms.length === 0 && (
            <p className="px-2 py-3 text-xs leading-relaxed text-muted-foreground">
              Belum ada percakapan. Buat satu untuk mulai.
            </p>
          )}
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => openRoom(room.id)}
              aria-current={room.id === roomId ? "true" : undefined}
              className={`w-full truncate rounded-full px-3 py-2 text-left text-xs transition ${
                room.id === roomId
                  ? "bg-brand-tint/10 font-medium text-brand-700 dark:bg-brand-tint/15 dark:text-brand-100"
                  : "text-muted-foreground hover:bg-brand-tint/10 dark:hover:bg-brand-tint/15"
              }`}
            >
              {room.title}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {notice && (
          <p
            role="status"
            className="border-b border-border bg-muted px-4 py-2 text-xs leading-relaxed"
          >
            {notice}
          </p>
        )}
        <div className="min-h-0 flex-1">
          <ChatColumn
            messages={messages}
            canvas={canvas}
            sending={sending}
            disabled={!roomId}
            onSend={send}
            onAddDestination={addDestination}
            onPickAccommodation={pickAccommodation}
            onPickFlight={pickFlight}
          />
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 border-l border-border lg:block">
        {busy && (
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            menyimpan…
          </div>
        )}
        <PlanPanel
          canvas={canvas}
          busy={busy}
          onPatchItem={patchItem}
          onRemoveItem={dropItem}
          onDropFlight={dropFlight}
          onPickFlight={pickFlight}
          onCheckout={checkout}
        />
      </aside>
    </div>
  );
}
