import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className={`modal${wide ? " modal-wide" : ""}`} onCancel={(event) => { event.preventDefault(); onClose(); }} aria-labelledby="modal-title">
    <div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-btn" aria-label="关闭对话框" onClick={onClose}><Icon name="close" /></button></div>
    <div className="modal-body">{children}</div>
  </dialog>;
}
