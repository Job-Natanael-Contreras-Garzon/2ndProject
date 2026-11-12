const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";
// ID de Google Analytics 4 (formato G-XXXXXXXXXX). Si no está en el .env, GA no se activa.
const GA_ID = import.meta.env?.VITE_GA_ID;

// Lista de campos prohibidos para asegurar que jamás se capture PII
const PII_FIELDS = new Set([
    "email", "mail", "nombre", "name", "user", "usuario", "userid",
    "user_id", "userId", "titulo", "title", "descripcion", "description",
    "password", "token", "telefono", "phone", "celular", "rut", "dni"
]);

function sanitizeProps(rawProps) {
    if (!rawProps || typeof rawProps !== "object" || Array.isArray(rawProps)) {
        return {};
    }
    const clean = {};
    for (const [key, value] of Object.entries(rawProps)) {
        if (!PII_FIELDS.has(key.toLowerCase())) {
            clean[key] = value;
        }
    }
    return clean;
}

/**
 * Carga Google Analytics 4 una sola vez. Se llama al iniciar la app (main.js).
 * Los eventos se ven en Google Analytics > Informes > Tiempo real.
 */
export function iniciarGoogleAnalytics() {
    if (!GA_ID || typeof document === "undefined" || window.gtag) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
        window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
}

/**
 * Función cliente para el rastreo de eventos de producto.
 * Convención: objeto + accion_en_pasado (minúsculas, snake_case).
 * NUNCA debe incluir información personal identificable (PII).
 *
 * @param {string} evento - Nombre del evento en snake_case
 * @param {Record<string, any>} props - Propiedades mínimas sin PII
 * @returns {Promise<{ evento: string, props: Record<string, any>, fecha: string }>}
 */
export async function track(evento, props = {}) {
    const cleanProps = sanitizeProps(props);
    const registro = {
        evento,
        props: cleanProps,
        fecha: new Date().toISOString(),
    };

    // Registro en consola para trazabilidad según especificación
    console.log("[evento]", registro);

    // Mismo evento hacia Google Analytics 4 (solo si está activado)
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag("event", evento, cleanProps);
    }

    try {
        await fetch(`${API_URL}/eventos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(registro),
            keepalive: true,
        });
    } catch (err) {
        // La analítica nunca interrumpe el flujo normal del usuario
        console.warn("[analitica] Error al enviar evento:", err);
    }

    return registro;
}
