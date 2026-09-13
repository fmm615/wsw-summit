/** Parses a `Cookie` request header into a plain { name: value } object. */
export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf("=");
        const name = pair.slice(0, idx);
        const value = pair.slice(idx + 1);
        try {
          return [name, decodeURIComponent(value)];
        } catch {
          return [name, value];
        }
      })
  );
}
