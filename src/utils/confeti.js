// Lluvia de confeti en un canvas temporal (sin librerías). Se usa al aprobarse un pago.
const COLORES = ['#2b45e0', '#ffe38a', '#bfe8d6', '#ffd0b8', '#d9ccff', '#1a1d3a'];

export function lanzarConfeti({ duracion = 2600, cantidad = 160 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: '1000', pointerEvents: 'none' });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  canvas.width = ancho * dpr;
  canvas.height = alto * dpr;
  canvas.style.width = `${ancho}px`;
  canvas.style.height = `${alto}px`;
  ctx.scale(dpr, dpr);

  // Dos cañones, uno en cada esquina inferior, disparando hacia el centro.
  const piezas = Array.from({ length: cantidad }, (_, i) => {
    const izquierda = i % 2 === 0;
    const angulo = (izquierda ? -60 : -120) + (Math.random() - 0.5) * 40;
    const velocidad = 11 + Math.random() * 9;
    return {
      x: izquierda ? 0 : ancho,
      y: alto * 0.85,
      vx: Math.cos((angulo * Math.PI) / 180) * velocidad,
      vy: Math.sin((angulo * Math.PI) / 180) * velocidad,
      giro: Math.random() * Math.PI,
      vGiro: (Math.random() - 0.5) * 0.3,
      ancho: 6 + Math.random() * 6,
      alto: 8 + Math.random() * 8,
      color: COLORES[i % COLORES.length],
      circulo: Math.random() < 0.3,
    };
  });

  const inicio = performance.now();
  const cuadro = (ahora) => {
    const t = ahora - inicio;
    ctx.clearRect(0, 0, ancho, alto);
    ctx.globalAlpha = t > duracion - 600 ? Math.max(0, (duracion - t) / 600) : 1;
    piezas.forEach((p) => {
      p.vy += 0.32; // gravedad
      p.vx *= 0.99; // roce del aire
      p.x += p.vx;
      p.y += p.vy;
      p.giro += p.vGiro;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.color;
      if (p.circulo) {
        ctx.beginPath();
        ctx.arc(0, 0, p.ancho / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Achatar en Y simula que el papel gira en el aire.
        ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto * Math.abs(Math.cos(p.giro)));
      }
      ctx.restore();
    });
    if (t < duracion) requestAnimationFrame(cuadro);
    else canvas.remove();
  };
  requestAnimationFrame(cuadro);
}
