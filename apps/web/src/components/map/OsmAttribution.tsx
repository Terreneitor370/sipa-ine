/** Atribución obligatoria OpenStreetMap (ADR / doc de arquitectura). */
export function OsmAttribution() {
  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 z-[500] max-w-[70%] border-t border-r border-linea bg-white/90 px-2 py-0.5 text-[10px] text-ink-2">
      ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="text-acento hover:underline"
      >
        OpenStreetMap
      </a>{" "}
      contributors
    </div>
  );
}
