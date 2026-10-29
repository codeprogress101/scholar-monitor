import { useEffect, useState } from "react";
import { pendingPrior } from "./prior-command";
import { payrollWorkspaceLinks } from "./payroll-workspace";

export default function PayrollWorkspaceNav({ hash, actor }: { hash: string; actor: string }) {
  const [location, setLocation] = useState(hash);
  useEffect(() => {
    const update = () => setLocation(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("payroll-location-changed", update);
    return () => { window.removeEventListener("hashchange", update); window.removeEventListener("payroll-location-changed", update); };
  }, [hash]);
  const storage = `ldss-payroll-location:${actor}`;
  let remembered = "";
  try { remembered = sessionStorage.getItem(storage) ?? ""; } catch { /* Navigation remains usable without storage. */ }
  const { active, links } = payrollWorkspaceLinks(location, remembered);
  useEffect(() => {
    if (!new URLSearchParams(location.split("?")[1]).has("cycle")) return;
    try { sessionStorage.setItem(storage, location); } catch { /* Never a financial command. */ }
  }, [location, storage]);
  return <nav className="payroll-workspace-nav" aria-label="Payroll workspace">
    {links.map(link => <a key={link.id} href={link.href} aria-current={active === link.id ? "page" : undefined}
      onClick={event => { if (pendingPrior(actor)) event.preventDefault(); }}>{link.label}</a>)}
  </nav>;
}
