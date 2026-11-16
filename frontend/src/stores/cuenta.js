import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";

const API_URL = import.meta.env.VITE_API_URL;

const SIN_CONEXION = "No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo en unos segundos.";

export const useCuentaStore = defineStore("cuenta", () => {
    const auth = useAuthStore();

    // Llama a la API con la sesión y devuelve la respuesta ya leída
    async function pedir(ruta, opciones = {}) {
        let res;
        try {
            res = await fetch(`${API_URL}${ruta}`, {
                ...opciones,
                headers: { Authorization: `Bearer ${auth.token}` },
            });
        } catch {
            throw new Error(SIN_CONEXION);
        }

        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.message || data.error || "Ocurrió un error. Intenta de nuevo.");
            // 409: la regla de la app bloqueó la acción (por ejemplo, hay un intercambio en curso)
            err.bloqueada = res.status === 409;
            throw err;
        }
        return data;
    }

    function verMisDatos() {
        return pedir("/mis-datos");
    }

    function eliminarCuenta() {
        return pedir("/cuenta", { method: "DELETE" });
    }

    return { verMisDatos, eliminarCuenta };
});
