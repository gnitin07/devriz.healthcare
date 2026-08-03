import { useCallback, useRef, useState } from "react";

/**
 * Draggable before/after comparison for the transformation cards.
 *
 * The "after" photo is the base layer and the "before" photo sits on top,
 * clipped to the handle position with clip-path. Clipping (rather than sizing
 * a wrapper) keeps the top image at full frame width, so it never squashes as
 * the handle moves.
 *
 * Pointer events cover mouse, touch and pen in one path; setPointerCapture
 * keeps the drag alive when the cursor leaves the frame.
 */
const BeforeAfterSlider = ({ before, after, alt, duration }) => {
  const [pos, setPos] = useState(50);
  const frame = useRef(null);
  const dragging = useRef(false);

  const setFromX = useCallback((clientX) => {
    const el = frame.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onPointerDown = (e) => {
    dragging.current = true;
    // Move first, capture second — setPointerCapture can throw on a plain tap
    // and would otherwise abort the handler before the handle repositions.
    setFromX(e.clientX);
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* capture is an enhancement */ }
  };
  const onPointerMove = (e) => { if (dragging.current) setFromX(e.clientX); };
  const stop = (e) => {
    dragging.current = false;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* already released */ }
  };

  const onKeyDown = (e) => {
    const step = e.shiftKey ? 10 : 4;
    const move = { ArrowLeft: -step, ArrowRight: step, Home: -100, End: 100 }[e.key];
    if (move === undefined) return;
    e.preventDefault();
    setPos((p) => Math.min(100, Math.max(0, p + move)));
  };

  return (
    <div
      ref={frame}
      className="ba-slider"
      style={{ "--pos": `${pos}%` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onKeyDown={onKeyDown}
      role="slider"
      tabIndex={0}
      aria-label={`${alt}: drag to compare before and after`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
    >
      <img src={after} alt={`${alt}, after treatment`} loading="lazy" draggable="false" />
      <img className="ba-before" src={before} alt={`${alt}, before treatment`} loading="lazy" draggable="false" />
      <span className="ba-tag left-3">Before</span>
      <span className="ba-tag right-3">After</span>
      <span className="ba-handle" aria-hidden="true"><span className="ba-grip" /></span>
      {duration && <span className="ba-duration">✨ Results in {duration}</span>}
    </div>
  );
};

export default BeforeAfterSlider;
