import { useEffect } from "react";

export function readAdminView<T extends Record<string, string | number | boolean>>(key: string, defaults: T): T {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "{}");
    return Object.fromEntries(Object.entries(defaults).map(([name, value]) => [name,
      typeof saved?.[name] === typeof value && (typeof value !== "number" || (Number.isSafeInteger(saved[name]) && saved[name] >= 0)) ? saved[name] : value,
    ])) as T;
  } catch { return defaults; }
}

export function useAdminView(key: string, state: Record<string, string | number | boolean>, ready: boolean) {
  const serialized = JSON.stringify(state);
  useEffect(() => { sessionStorage.setItem(key, serialized); }, [key, serialized]);
  useEffect(() => {
    if (!ready) return;
    const y = Number(sessionStorage.getItem(`${key}:scroll`) ?? 0);
    const frame = requestAnimationFrame(() => window.scrollTo(0, Number.isFinite(y) ? y : 0));
    const save = () => sessionStorage.setItem(`${key}:scroll`, String(window.scrollY));
    window.addEventListener("scroll", save, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", save); };
  }, [key, ready]);
}
