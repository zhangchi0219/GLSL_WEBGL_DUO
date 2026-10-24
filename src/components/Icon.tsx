const paths = {
  wrap: "M3 5h18M3 10h14a4 4 0 0 1 0 8h-5m3-3-3 3 3 3M3 15h4",
  check: "m5 12 4 4L19 6",
  copy: "M8 8h13v13H8ZM3 16V3h13",
  play: "m8 5 11 7-11 7Z", pause: "M8 5v14M16 5v14", plus: "M12 5v14M5 12h14",
  upload: "M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4", download: "M12 4v12m-5-5 5 5 5-5M4 17v3h16v-3",
  reset: "M4 10a8 8 0 1 1 1 8M4 4v6h6", code: "m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5", close: "m6 6 12 12M6 18 18 6",
  library: "M4 4h4v16H4zm8 0v16m4-16 4 16", sliders: "M4 7h16M4 17h16M9 4v6m6 4v6",
  arrow: "M5 12h14m-5-5 5 5-5 5", search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5",
  chevron: "m9 5 7 7-7 7", image: "M3 4h18v16H3Zm0 12 5-5 5 5 4-4 4 4M8 8h.01",
  save: "M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-8h10v8",
};
export function Icon({ name, size = 16 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
