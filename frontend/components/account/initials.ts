/** First letters of the first two words, for avatar placeholders. */
export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
