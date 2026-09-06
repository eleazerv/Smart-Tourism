"use client";

/**
 * Ruang kerja perencana: daftar percakapan, kolom chat, dan panel rencana.
 *
 * Satu aturan yang dipegang seluruh berkas ini: canvas tidak pernah ditambal
 * di sisi klien. Setiap endpoint `/api/trips/...` dan setiap giliran chat
 * membalas rencana utuh, dan itulah yang dipasang sebagai state. Jadi tidak
 * ada jalan bagi panel untuk menampilkan sesuatu yang tidak ada di database.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatColumn } from "@/components/planner/chat-column";
import { PlanPanel } from "@/components/planner/plan-panel";
import {
  ApiError,
  listCities,
  addTripItem,
  checkoutTrip,
  createChatRoom,
  getChatRoom,
  listChatRooms,
  removeTripFlight,
  removeTripItem,
  removeTripStop,
  sendChatMessage,
  setTripFlight,
  updateTripItem,
  updateTripStop,
  type City,
  type ChatMessage,
  type ChatRoom,
  type PlannerFlightOption,
  type TripCanvas,
  type TripFlightRole,
} from "@/lib/api";
import type { StopPatch } from "@/components/planner/plan-panel";
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
  const [cities, setCities] = useState<City[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Token dibaca ulang di setiap pemanggilan.
   *
   * Sempat disimpan sekali di sebuah ref demi menghemat satu panggilan, dan
   * justru itu sumber 401 "Invalid Token": access token Supabase kedaluwarsa
   * dalam hitungan jam, klien menyegarkannya sendiri di latar, tapi ref-nya
   * tidak pernah tahu — jadi setiap aksi sesudah itu mengirim token basi.
   *
   * Penghematannya pun semu. `getSession()` membaca dari penyimpanan lokal
   * dan baru menembak jaringan kalau tokennya memang sudah waktunya
   * diperbarui, persis seperti yang dilakukan seluruh bagian app lain.
   */
  const auth = useCallback(async () => {
    return { token: await getBrowserAccessToken() };
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


useEffect(() => {
  (async () => {
    try {
      setCities(await listCities());
    } catch {
      // Kartu penerbangan tetap jalan tanpa pencocokan provinsi kalau ini gagal.
    }
  })();
}, []);

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

  /**
   * Mengirim satu giliran, membuat ruangnya lebih dulu kalau belum ada.
   *
   * Tombol "Rencana baru" tetap ada untuk yang mau memulai dari kanvas
   * kosong, tapi ia bukan lagi syarat: menulis di kotak yang kosong sudah
   * cukup. Ruang yang lahir tanpa pernah diisi cuma jadi sampah di sidebar,
   * jadi pembuatannya ditunda sampai ada yang benar-benar mau dikatakan.
   */
  async function send(message: string) {
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

    let target = roomId;
    if (!target) {
      try {
        const room = await createChatRoom(await auth());
        setRooms((prev) => [room, ...prev]);
        setRoomId(room.id);
        setTripId(room.trip_id);
        target = room.id;

        // Kepala rencananya diisi sekarang juga, supaya panel kanan tidak
        // berkata "buka percakapan dulu" padahal percakapannya baru saja
        // lahir. Satu GET ringan, dan ia selesai jauh sebelum giliran
        // pertama dijawab. Sengaja ditunggu, bukan dilepas: kalau ia
        // mendarat setelah giliran selesai, canvas kosongnya akan menimpa
        // rencana yang baru saja disusun.
        try {
          const opened = await getChatRoom(room.id, await auth());
          if (opened) setCanvas(opened.canvas);
        } catch {
          // Panel menyusul lewat balasan gilirannya sendiri.
        }
      } catch (err) {
        report(err, "Percakapan baru gagal dibuat.");
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        setSending(false);
        return;
      }
    }

    try {
      const turn = await sendChatMessage(target, message, await auth());
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
    async (stopId: string, accommodationId: string) => {
      if (!tripId) return;
      await mutate(
        (token) =>
          updateTripStop(
            tripId,
            stopId,
            { accommodation_id: accommodationId },
            token,
          ),
        "Penginapan itu gagal dipilih.",
      );
    },
    [mutate, tripId],
  );

  const patchStop = useCallback(
    async (stopId: string, patch: StopPatch) => {
      if (!tripId) return;
      await mutate(
        (token) => updateTripStop(tripId, stopId, patch, token),
        "Perubahan itu gagal disimpan.",
      );
    },
    [mutate, tripId],
  );

  const dropStop = useCallback(
    async (stopId: string) => {
      if (!tripId) return;
      await mutate(
        (token) => removeTripStop(tripId, stopId, token),
        "Kota itu gagal dihapus.",
      );
    },
    [mutate, tripId],
  );

  const pickFlight = useCallback(
    async (
      option: PlannerFlightOption,
      stopId: string,
      role: TripFlightRole,
    ) => {
      if (!tripId) return;

      // Tiap kota cuma punya satu leg masuk dan satu leg keluar, jadi memilih
      // di peran yang sudah terisi berarti mengganti. Itu wajar (ganti
      // pikiran), tapi harus disadari — bukan terjadi diam-diam.
      const stop = (canvas?.stops ?? []).find((s) => s.id === stopId);
      const existing = stop?.trip_flights.find((f) => f.flight_role === role);
      if (existing && !existing.booked_at) {
        const current = existing.flight_options;
        const where = stop?.cities?.name ?? "kota ini";
        const what = role === "arrival" ? "masuk ke" : "keluar dari";
        const ok = window.confirm(
          `Penerbangan ${what} ${where} sudah diisi ${current?.airline} ${current?.flight_number}. Ganti dengan ${option.airline} ${option.flight_number}?`,
        );
        if (!ok) return;
      }

      await mutate(
        (token) =>
          setTripFlight(
            tripId,
            stopId,
            { flight_option_id: option.id, flight_role: role },
            token,
          ),
        "Penerbangan itu gagal dipakai. Kursinya mungkin sudah habis.",
      );
    },
    [canvas, mutate, tripId],
  );

  const patchItem = useCallback(
    async (itemId: string, patch: { status?: "suggested" | "confirmed" }) => {
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
    async (stopId: string, role: TripFlightRole) => {
      if (!tripId) return;
      await mutate(
        (token) => removeTripFlight(tripId, stopId, role, token),
        "Penerbangan itu gagal dilepas.",
      );
    },
    [mutate, tripId],
  );

  /**
   * Checkout kini satu trip_booking untuk seluruh rencana, bukan sekumpulan
   * pesanan terpisah — jadi hasilnya satu kode booking dan satu total, dan
   * kegagalan datang sebagai error dari endpoint-nya, bukan daftar per baris.
   */
  async function checkout(passengerNames: string[]) {
    if (!tripId) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await checkoutTrip(tripId, passengerNames, await auth());
      const parts = [
        result.accommodation_count
          ? `${result.accommodation_count} penginapan`
          : null,
        result.flight_count ? `${result.flight_count} penerbangan` : null,
      ].filter(Boolean);

      setNotice(
        `Checkout selesai — kode ${result.booking_code}` +
          (parts.length ? ` (${parts.join(" & ")})` : "") +
          `. Pesanan masih pending sampai dibayar; lanjutkan di halaman Pesanan.`,
      );
      if (roomId) await openRoom(roomId);
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
                  ? "bg-brand-tint/10 font-medium text-brand-700"
                  : "text-muted-foreground hover:bg-brand-tint/10"
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
            cities={cities}
            messages={messages}
            canvas={canvas}
            sending={sending}
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
          onPatchStop={patchStop}
          onRemoveStop={dropStop}
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
