// Cliente único para hablar con el backend.
// Todo lo que necesite la URL de la API o hacer una petición debe pasar por aquí.

export const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

export const MENSAJE_SIN_CONEXION =
    "No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo en unos segundos.";

/**
 * Hace una petición a la API y devuelve los datos ya leídos (JSON).
 *
 * - token: si se pasa, se envía como `Authorization: Bearer <token>`.
 * - body: objeto que se envía como JSON.
 * - mensajeError: texto por defecto cuando el servidor no manda uno.
 *
 * Si falla lanza un Error con:
 *   err.network = true  -> no hubo conexión con el servidor
 *   err.status          -> código HTTP cuando el servidor respondió con error
 */
export async function pedirApi(ruta, { token, method = "GET", body, mensajeError } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
        res = await fetch(`${API_URL}${ruta}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        const err = new Error(MENSAJE_SIN_CONEXION);
        err.network = true;
        throw err;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(
            data.message || data.error || mensajeError || "Ocurrió un error. Intenta de nuevo.",
        );
        err.status = res.status;
        throw err;
    }
    return data;
}
