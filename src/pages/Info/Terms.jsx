import styles from './Info.module.css';

export default function Terms() {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Términos y condiciones</h1>
      <p className={styles.lead}>Última actualización: octubre de 2026.</p>

      <section className={styles.seccion}>
        <h2>1. Compras</h2>
        <p>
          Los precios incluyen IVA y están expresados en pesos chilenos. El stock se reserva al iniciar el pago y se
          confirma cuando el medio de pago aprueba la transacción. Si el pago no se completa en 15 minutos, la reserva se
          libera.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>2. Medicamentos de venta bajo receta</h2>
        <p>
          Los productos marcados con "Requiere receta" solo se venden con una receta médica vigente, validada por nuestro
          químico farmacéutico. Cada receta respalda una sola compra y se presenta al retirar o recibir el pedido.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>3. Despacho y retiro</h2>
        <p>
          El retiro en farmacia es gratuito y requiere presentar la cédula de identidad. El despacho a domicilio tiene un
          costo de $2.990 (gratis desde $25.000) y un plazo estimado de 1 a 2 días hábiles en la Región Metropolitana.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>4. Cambios y devoluciones</h2>
        <p>
          Por seguridad sanitaria, los medicamentos no tienen cambio una vez entregados, salvo falla o error en el
          producto. Para reclamos, presenta el comprobante de compra en cualquiera de nuestras farmacias.
        </p>
      </section>
    </article>
  );
}
