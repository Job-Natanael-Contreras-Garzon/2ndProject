import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { pedirApi } from "@/api/client";

export const useCuentaStore = defineStore("cuenta", () => {
    const auth = useAuthStore();

    // Llama a la API con la sesión y devuelve la respuesta ya leída
    async function pedir(ruta, opciones = {}) {
        try {
            return await pedirApi(ruta, { ...opciones, token: auth.token });
        } catch (err) {
            // 409: la regla de la app bloqueó la acción (por ejemplo, hay un intercambio en curso)
            err.bloqueada = err.status === 409;
            throw err;
        }
    }

    function verMisDatos() {
        return pedir("/mis-datos");
    }

    function eliminarCuenta() {
        return pedir("/cuenta", { method: "DELETE" });
    }

    return { verMisDatos, eliminarCuenta };
});
