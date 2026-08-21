import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import { Suspense } from "react";
import { API_BASE_URL, ApiError, getPreferences, getProfile } from "@/lib/api";
import { getAccessToken } from "@/lib/api/session";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

/**
 * End-to-end check of the auth bridge: the Supabase session cookie held by
 * Next.js is forwarded as a bearer token, and `authMiddleware` on the Express
 * side accepts it. If this renders, authenticated API calls work.
 */
async function BackendProfile() {
  const token = await getAccessToken();
  if (!token) return <p className="text-sm">Belum ada sesi Supabase aktif.</p>;

  try {
    const [profile, preferences] = await Promise.all([
      getProfile({ token }),
      getPreferences({ token }),
    ]);

    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Nama:</span>{" "}
          {profile?.full_name ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Email:</span>{" "}
          {profile?.email ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Peran:</span>{" "}
          {profile?.role ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Preferensi:</span>{" "}
          {preferences.length > 0
            ? preferences.map((tag) => tag.name).join(", ")
            : "belum dipilih"}
        </p>
      </div>
    );
  } catch (error) {
    const detail =
      error instanceof ApiError
        ? `${error.status} ${error.code} — ${error.message}`
        : "Kesalahan tidak terduga";
    return (
      <p className="text-sm text-muted-foreground">
        Gagal memanggil {API_BASE_URL}/api/auth/me: {detail}
      </p>
    );
  }
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          <Suspense>
            <UserDetails />
          </Suspense>
        </pre>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Dari Express API</h2>
        <div className="w-full rounded border p-4">
          <Suspense fallback={<p className="text-sm">Memuat…</p>}>
            <BackendProfile />
          </Suspense>
        </div>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div>
    </div>
  );
}
