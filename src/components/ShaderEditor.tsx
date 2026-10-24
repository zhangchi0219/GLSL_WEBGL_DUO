import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter, keymap, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, indentOnInput, StreamLanguage, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { setDiagnostics, lintGutter } from "@codemirror/lint";
import { shader } from "@codemirror/legacy-modes/mode/clike";
import { tags } from "@lezer/highlight";
import type { ShaderDiagnostic } from "../gl/program";

const colors = HighlightStyle.define([
  { tag: tags.keyword, color: "#b4a5d8" }, { tag: [tags.typeName, tags.standard(tags.variableName)], color: "#9daec3" },
  { tag: [tags.number, tags.bool], color: "#c4b892" }, { tag: tags.comment, color: "#737373" },
  { tag: tags.string, color: "#a6baa0" }, { tag: tags.meta, color: "#999999" },
]);
interface Props { code: string; onChange: (code: string) => void; onRun: () => void; diagnostics: ShaderDiagnostic[]; jump?: { line: number; key: number }; readOnly?: boolean; ariaLabel?: string; wrap?: boolean }
export function ShaderEditor({ code, onChange, onRun, diagnostics, jump, readOnly = false, ariaLabel = "GLSL 源码编辑器", wrap = true }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>();
  const wrapping = useRef(new Compartment());
  const callbacks = useRef({ onChange, onRun }); callbacks.current = { onChange, onRun };
  useEffect(() => {
    if (!host.current) return;
    view.current = new EditorView({ parent: host.current, state: EditorState.create({ doc: code, extensions: [
      EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly), wrapping.current.of(wrap ? EditorView.lineWrapping : []),
      lineNumbers(), ...(readOnly ? [] : [highlightActiveLine(), highlightActiveLineGutter()]), history(), drawSelection(), indentOnInput(), bracketMatching(),
      StreamLanguage.define(shader), syntaxHighlighting(colors), highlightSelectionMatches(), lintGutter(),
      keymap.of([{ key: "Mod-Enter", run: () => { callbacks.current.onRun(); return true; } }, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel, spellcheck: "false" }),
      EditorView.updateListener.of((update) => { if (update.docChanged) callbacks.current.onChange(update.state.doc.toString()); }),
      EditorView.theme({ "&": { height: "100%", backgroundColor: "#0c0c0c", color: "#d3d3d3" }, ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.6" }, ".cm-content": { padding: "16px 0", caretColor: "#eee" }, ".cm-line": { padding: "0 16px 0 8px" }, ".cm-gutters": { backgroundColor: "#0c0c0c", color: "#646464", border: "none", minWidth: "46px" }, ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#151515" }, ".cm-cursor": { borderLeftColor: "#eee" }, "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "#313131" }, ".cm-panels": { backgroundColor: "#171717", color: "#ddd" }, ".cm-tooltip": { backgroundColor: "#222", color: "#eee", border: "1px solid #444" } }, { dark: true }),
    ] }) });
    return () => { view.current?.destroy(); view.current = undefined; };
  }, []);
  useEffect(() => {
    view.current?.dispatch({ effects: wrapping.current.reconfigure(wrap ? EditorView.lineWrapping : []) });
  }, [wrap]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== code) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: code } });
  }, [code]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    editor.dispatch(setDiagnostics(editor.state, diagnostics.filter((d) => d.line).map((d) => {
      const line = editor.state.doc.line(Math.min(editor.state.doc.lines, Math.max(1, d.line!)));
      return { from: line.from, to: line.to, severity: "error" as const, message: d.message };
    })));
  }, [diagnostics]);
  useEffect(() => {
    const editor = view.current;
    if (!editor || !jump) return;
    const line = editor.state.doc.line(Math.min(editor.state.doc.lines, Math.max(1, jump.line)));
    editor.dispatch({ selection: { anchor: line.from }, effects: EditorView.scrollIntoView(line.from, { y: "center" }) });
    editor.focus();
  }, [jump]);
  return <div className="code-host" ref={host} />;
}
