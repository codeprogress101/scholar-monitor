import { useEffect, useRef } from "react";

/** Keep an explicitly opened task in view without focusing a submit button. */
export function useActionForm(task: unknown) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!task || !ref.current) return;
    ref.current.tabIndex = -1;
    ref.current.focus({ preventScroll: true });
    ref.current.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [task]);
  return ref;
}
