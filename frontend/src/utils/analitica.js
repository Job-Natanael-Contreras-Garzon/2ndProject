const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

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
