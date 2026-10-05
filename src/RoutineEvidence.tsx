import { Children, cloneElement, isValidElement, useId, type ReactNode, type ReactElement } from "react";

type FieldProps = { children?: ReactNode; id?: string; name?: string; required?: boolean; minLength?: number; list?: string };
export default function RoutineEvidence({ children, routine = true, referenceRequired = false }: {
  children: ReactNode; routine?: boolean; referenceRequired?: boolean;
}) {
  const reasonList = useId();
  function simplify(nodes: ReactNode, context = ""): ReactNode {
    return Children.map(nodes, (node) => {
      if (!isValidElement<FieldProps>(node)) return node;
      const text = Children.toArray(node.props.children).filter((child) => typeof child === "string").join(" ");
      const hint = `${node.props.id ?? ""} ${node.props.name ?? ""} ${text || context}`.toLowerCase();
      if (node.type === "input" || node.type === "textarea") {
        const isReference = hint.includes("reference");
        const required = isReference ? referenceRequired : !routine;
        return cloneElement(node as ReactElement<FieldProps>, {
          required,
          // Empty optional controls are valid; supplied short prose is still
          // validated by the server. Never generate external evidence in UI.
          list: !isReference && required && node.type === "input" ? reasonList : undefined,
        });
      }
      return cloneElement(node, { children: simplify(node.props.children, hint) });
    });
  }
  const fields = <>{simplify(children)}<datalist id={reasonList}>
    {['Incomplete supporting documents', 'Details do not match the supporting record', 'Wrong academic year or semester', 'Duplicate or incorrect entry', 'Returned for correction after review'].map((value) => <option key={value} value={value} />)}
  </datalist></>;
  return routine && !referenceRequired
    ? <details className="col-12 my-2"><summary>Additional details (optional)</summary><p className="small text-muted">Your account, action and time are recorded automatically. Add a note or an actual supporting reference only if useful.</p>{fields}</details>
    : <div className="col-12">{fields}</div>;
}
