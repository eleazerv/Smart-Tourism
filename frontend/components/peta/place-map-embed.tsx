"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary around the Leaflet map.
 *
 * `LocationCard` is a Server Component, and `next/dynamic` with `ssr: false`
 * is only allowed inside a Client Component — but the flag is exactly what is
 * needed here, since Leaflet touches `window` at import time. This file is the
 * one-line client island that lets the card around it stay on the server.
 */
const PlaceMap = dynamic(() => import("@/components/peta/place-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

export function PlaceMapEmbed({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  return <PlaceMap lat={lat} lng={lng} label={label} />;
}
