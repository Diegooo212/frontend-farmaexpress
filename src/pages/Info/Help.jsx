import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Info.module.css';

const SECCIONES = [
  {
    id: 'compras',
    titulo: 'Compras',
    preguntas: [
      {
        p: '¿Cómo compro?',
        r: 'Agrega productos al carrito, elige si retiras en farmacia o te los despachamos, y paga con Webpay, Mercado Pago o Khipu. Puedes seguir tu pedido en Mis pedidos.',
      },
      {
        p: '¿Por qué hay un máximo por pedido?',
        r: 'Cada pedido se entrega desde un solo lugar (una farmacia o el almacén central), así que no puedes pedir más de lo que tiene la sucursal con más stock de ese producto.',
      },
      {
        p: '¿Qué pasa si el pago falla?',
        r: 'Tus productos quedan reservados por 15 minutos para que pagues con otro medio desde Mis pedidos. Si no pagas en ese tiempo, la reserva se libera y no se hace ningún cobro.',
      },
    ],
  },
  {
    id: 'recetas',
    titulo: 'Compras con receta',
    preguntas: [
      {
        p: '¿Qué productos necesitan receta?',
        r: 'Los que muestran la etiqueta "Requiere receta", como antibióticos o algunos analgésicos. La ley exige que un químico farmacéutico revise la receta antes de venderlos.',
      },
      {
        p: '¿Cómo compro un producto con receta?',
        r: 'Primero envía la foto o PDF de tu receta en Mis recetas. Cuando el químico farmacéutico la valide (te avisamos en la campana), elígela al pagar. Cada receta sirve para una compra.',
      },
      {
        p: '¿Y si rechazan mi receta?',
        r: 'Verás el motivo en Mis recetas (por ejemplo, que está vencida o ilegible). Puedes enviar una nueva cuando quieras.',
      },
    ],
  },
  {
    id: 'despacho',
    titulo: 'Despacho y retiro',
    preguntas: [
      {
        p: '¿Cuánto cuesta el despacho?',
        r: 'El despacho a domicilio cuesta $2.990 y es gratis en compras desde $25.000. Llega en 1 a 2 días hábiles. El retiro en farmacia siempre es gratis.',
      },
      {
        p: '¿Cuándo puedo retirar?',
        r: 'Normalmente en 2 horas dentro del horario de la farmacia. Te avisamos cuando tu pedido esté listo. Para retirarlo, lleva tu carnet de identidad.',
      },
      {
        p: '¿A qué comunas despachan?',
        r: 'A la Región Metropolitana, desde nuestro almacén central.',
      },
    ],
  },
  {
    id: 'pagos',
    titulo: 'Pagos',
    preguntas: [
      {
        p: '¿Qué medios de pago aceptan?',
        r: 'Webpay (tarjetas de crédito, débito y prepago), Mercado Pago y Khipu (transferencia). Si uno no está disponible en ese momento, el checkout te muestra los otros.',
      },
      {
        p: '¿Guardan los datos de mi tarjeta?',
        r: 'No. El pago se hace en el sitio de cada proveedor; FarmaExpress solo recibe la confirmación.',
      },
    ],
  },
];

export default function Help() {
  const { hash } = useLocation();

  // Los enlaces del pie de página llevan a una sección (/ayuda#despacho).
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Preguntas frecuentes</h1>
      <p className={styles.lead}>
        ¿No encuentras tu respuesta? Escríbenos a contacto@farmaexpress.cl o llama al 600 123 4567.
      </p>

      <nav className={styles.indice} aria-label="Temas">
        {SECCIONES.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.titulo}
          </a>
        ))}
      </nav>

      {SECCIONES.map((s) => (
        <section key={s.id} id={s.id} className={styles.seccion} aria-labelledby={`${s.id}-title`}>
          <h2 id={`${s.id}-title`}>{s.titulo}</h2>
          {s.preguntas.map((q) => (
            <details key={q.p} className={styles.pregunta}>
              <summary>{q.p}</summary>
              <p>{q.r}</p>
            </details>
          ))}
        </section>
      ))}

      <p className={styles.nota}>
        Revisa también los <Link to="/terminos">términos y condiciones</Link> y la{' '}
        <Link to="/privacidad">política de privacidad</Link>.
      </p>
    </article>
  );
}
