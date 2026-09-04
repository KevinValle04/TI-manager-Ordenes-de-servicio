import React, { useRef, useEffect } from 'react';

type Props = {
  onChange?: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
};

const SignaturePad: React.FC<Props> = ({ onChange, width = 400, height = 160 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';

    const getPos = (e: MouseEvent | Touch) => {
      const rect = canvas.getBoundingClientRect();
      if ('clientX' in e) return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
      // Touch
      return { x: (e as Touch).clientX - rect.left, y: (e as Touch).clientY - rect.top };
    };

    const start = (e: any) => { drawing.current = true; const p = getPos(e.touches ? e.touches[0] : e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: any) => { if (!drawing.current) return; const p = getPos(e.touches ? e.touches[0] : e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = () => { drawing.current = false; if (onChange) onChange(canvas.toDataURL('image/png')); };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);

    canvas.addEventListener('touchstart', start);
    canvas.addEventListener('touchmove', move);
    window.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [onChange]);

  const clear = () => {
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return; ctx.clearRect(0,0,c.width,c.height); if (onChange) onChange(null);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={width} height={height} style={{ border: '1px solid #ddd', borderRadius: 6, touchAction: 'none', width: '100%', height: 'auto' }} />
      <div style={{ marginTop: 8 }}>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clear}>Limpiar firma</button>
      </div>
    </div>
  );
};

export default SignaturePad;
