import { describe, it, expect, vi, afterEach } from "vitest";
import { pedirApi, API_URL, MENSAJE_SIN_CONEXION } from "@/api/client";

function respuesta(status, data) {
    return { ok: status >= 200 && status < 300, status, json: async () => data };
}

describe("api/client - pedirApi", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("manda el token y el cuerpo como JSON, y devuelve los datos", async () => {
        const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { ok: true }));
        vi.stubGlobal("fetch", fetchMock);

        const data = await pedirApi("/posts", { token: "abc", method: "POST", body: { a: 1 } });

        expect(data).toEqual({ ok: true });
        const [url, opciones] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API_URL}/posts`);
        expect(opciones.method).toBe("POST");
        expect(opciones.headers.Authorization).toBe("Bearer abc");
        expect(opciones.headers["Content-Type"]).toBe("application/json");
        expect(opciones.body).toBe(JSON.stringify({ a: 1 }));
    });

    it("sin token ni cuerpo no manda headers de más", async () => {
        const fetchMock = vi.fn().mockResolvedValue(respuesta(200, {}));
        vi.stubGlobal("fetch", fetchMock);

        await pedirApi("/eventos/resumen");

        const [, opciones] = fetchMock.mock.calls[0];
        expect(opciones.method).toBe("GET");
        expect(opciones.headers).toEqual({});
        expect(opciones.body).toBeUndefined();
    });

    it("si el servidor responde con error, lanza su mensaje y el status", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(respuesta(409, { message: "Hay un intercambio en curso" })),
        );

        await expect(pedirApi("/cuenta", { method: "DELETE" })).rejects.toMatchObject({
            message: "Hay un intercambio en curso",
            status: 409,
        });
    });

    it("usa el mensaje por defecto cuando el servidor no manda uno", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuesta(500, {})));

        await expect(pedirApi("/x", { mensajeError: "Error al cargar" })).rejects.toThrow("Error al cargar");
    });

    it("si no hay conexión, lanza el mensaje de sin conexión marcado como network", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

        await expect(pedirApi("/x")).rejects.toMatchObject({ message: MENSAJE_SIN_CONEXION, network: true });
    });
});
