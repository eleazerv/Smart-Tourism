import Image from "next/image";
import type { Profile } from "@/lib/api";
import { initialsOf } from "@/components/account/initials";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

export function ProfileCard({
  profile,
  fallbackEmail,
}: {
  /** Null when `/api/auth/me` has no row for this user yet. */
  profile: Profile | null;
  fallbackEmail: string;
}) {
  const email = profile?.email ?? fallbackEmail;
  const name = profile?.full_name?.trim() || email.split("@")[0];
  const joined = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-4 p-5">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-700 font-display text-lg font-bold text-white dark:bg-brand-100 dark:text-brand-900"
            >
              {initialsOf(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold tracking-tight">
              {name}
            </p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
        </div>

        <dl>
          {profile?.role && <Row label="Peran" value={profile.role} />}
          {joined && <Row label="Anggota sejak" value={joined} />}
        </dl>
      </div>

      {!profile && (
        <p className="text-sm text-muted-foreground">
          Detail profil belum tersedia — baris untuk akun ini belum ada di tabel{" "}
          <code className="font-mono">users</code>, jadi{" "}
          <code className="font-mono">/api/auth/me</code> membalas 404.
        </p>
      )}
    </div>
  );
}
