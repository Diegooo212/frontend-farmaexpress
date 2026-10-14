import styles from './Info.module.css';

export default function Privacy() {
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>Política de privacidad</h1>
      <p className={styles.lead}>Cómo usamos tus datos personales y de salud.</p>

      <section className={styles.seccion}>
        <h2>Qué datos usamos</h2>
        <ul>
          <li>Tu nombre y correo, que entrega tu cuenta de Microsoft al iniciar sesión.</li>
          <li>Tu teléfono y direcciones de despacho, si los guardas en Mi cuenta.</li>
          <li>Tus recetas médicas y su archivo (foto o PDF), para que un químico farmacéutico las valide.</li>
          <li>Tus pedidos y el resultado de cada pago (nunca los datos de tu tarjeta).</li>
        </ul>
      </section>

      <section className={styles.seccion}>
        <h2>Para qué los usamos</h2>
        <p>
          Solo para procesar tus compras, validar tus recetas, preparar y entregar tus pedidos, y avisarte de cada
          cambio. No vendemos ni compartimos tus datos con terceros, salvo el proveedor de pago que elijas.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Seguridad</h2>
        <p>
          El inicio de sesión lo hace Microsoft Entra ID y cada petición a nuestros servicios se valida con un token. Solo
          tú y el personal de farmacia autorizado pueden ver tus recetas.
        </p>
      </section>

      <section className={styles.seccion}>
        <h2>Tus derechos</h2>
        <p>
          Puedes pedir acceder, corregir o eliminar tus datos escribiendo a contacto@farmaexpress.cl, según la ley chilena
          de protección de datos personales.
        </p>
      </section>
    </article>
  );
}
