import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { track } from "@/utils/analitica";
import UserPostsView from "@/views/UserPostsView.vue";
import PostForm from "@/components/PostForm.vue";
import AnalyticsView from "@/views/AnalyticsView.vue";
import * as analiticaModule from "@/utils/analitica";

describe("Módulo de Analítica y Rastreo de Eventos", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe("Función track()", () => {
        it("genera el registro con fecha ISO, registra en consola y envía al backend", async () => {
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });

            const resultado = await track("publicacion_iniciada", { origen: "mis_publicaciones" });

            expect(resultado.evento).toBe("publicacion_iniciada");
            expect(resultado.props).toEqual({ origen: "mis_publicaciones" });
            expect(new Date(resultado.fecha).toISOString()).toBe(resultado.fecha);

            expect(consoleSpy).toHaveBeenCalledWith("[evento]", resultado);
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("/eventos"),
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(resultado),
                })
            );
        });

        it("maneja fallos de red sin lanzar error ni romper el flujo", async () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            vi.spyOn(console, "log").mockImplementation(() => {});
            vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network down"));

            await expect(track("publicacion_iniciada", {})).resolves.toBeDefined();
            expect(warnSpy).toHaveBeenCalled();
        });

        it("sanitiza y remueve PII del objeto props antes de registrar y enviar", async () => {
            vi.spyOn(console, "log").mockImplementation(() => {});
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({ success: true }),
            });

            const resultado = await track("publicacion_guardada", {
                categoria: "ropa",
                condicion: "usado",
                email: "juan@correo.com",
                name: "Juan",
                title: "Chaqueta personal",
                user: "juanito",
            });

            expect(resultado.props).toEqual({
                categoria: "ropa",
                condicion: "usado",
            });
            expect(resultado.props.email).toBeUndefined();
            expect(resultado.props.name).toBeUndefined();
            expect(resultado.props.title).toBeUndefined();

            const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
            expect(sentBody.props).toEqual({
                categoria: "ropa",
                condicion: "usado",
            });
        });
    });

    describe("Evento 1: publicacion_iniciada", () => {
        let pinia;

        beforeEach(() => {
            pinia = createPinia();
            setActivePinia(pinia);
            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({ posts: [] }),
            });
        });

        it("se dispara exactamente 1 vez al presionar '+ Nueva publicación'", async () => {
            const trackSpy = vi.spyOn(analiticaModule, "track").mockResolvedValue({});

            const wrapper = mount(UserPostsView, {
                global: {
                    plugins: [pinia],
                    stubs: {
                        PageTitle: true,
                        DataTable: true,
                        Modal: true,
                        PostForm: true,
                        OfferList: true,
                        CancelExchangeForm: true,
                        StateBadge: true,
                    },
                },
            });

            const createButton = wrapper.find("button.btn-primary");
            expect(createButton.exists()).toBe(true);

            await createButton.trigger("click");
            await flushPromises();

            expect(trackSpy).toHaveBeenCalledTimes(1);
            expect(trackSpy).toHaveBeenCalledWith(
                "publicacion_iniciada",
                { origen: "mis_publicaciones" }
            );
        });

        it("las propiedades son estrictamente { origen: 'mis_publicaciones' } y NO contienen datos personales (PII)", async () => {
            const trackSpy = vi.spyOn(analiticaModule, "track").mockResolvedValue({});

            const wrapper = mount(UserPostsView, {
                global: {
                    plugins: [pinia],
                    stubs: {
                        PageTitle: true,
                        DataTable: true,
                        Modal: true,
                        PostForm: true,
                        OfferList: true,
                        CancelExchangeForm: true,
                        StateBadge: true,
                    },
                },
            });

            await wrapper.find("button.btn-primary").trigger("click");
            await flushPromises();

            const callArgs = trackSpy.mock.calls[0];
            const eventName = callArgs[0];
            const props = callArgs[1];

            expect(eventName).toBe("publicacion_iniciada");
            // Estricta verificación de claves permitidas
            expect(Object.keys(props)).toEqual(["origen"]);
            expect(props.origen).toBe("mis_publicaciones");

            // Verificación explícita de ausencia de PII
            expect(props.email).toBeUndefined();
            expect(props.user).toBeUndefined();
            expect(props.userId).toBeUndefined();
            expect(props.name).toBeUndefined();
            expect(props.token).toBeUndefined();
        });
    });

    describe("Evento 2: publicacion_guardada", () => {
        let pinia;

        beforeEach(() => {
            pinia = createPinia();
            setActivePinia(pinia);
        });

        it("se dispara exactamente 1 vez tras crear exitosamente la publicación", async () => {
            const trackSpy = vi.spyOn(analiticaModule, "track").mockResolvedValue({});
            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({
                    post: { id: "p1", title: "Cálculo", category: "libros", condition: "usado" },
                }),
            });

            const wrapper = mount(PostForm, {
                props: { post: null },
                global: { plugins: [pinia] },
            });

            // Llenar formulario
            await wrapper.find('input[type="text"]').setValue("Cálculo Stewart");
            const selects = wrapper.findAll("select");
            await selects[0].setValue("libros");
            await selects[1].setValue("usado");

            // Enviar formulario
            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            expect(trackSpy).toHaveBeenCalledTimes(1);
            expect(trackSpy).toHaveBeenCalledWith("publicacion_guardada", {
                categoria: "libros",
                condicion: "usado",
            });
        });

        it("las propiedades son estrictamente { categoria, condicion } y NO contienen datos personales ni título (PII)", async () => {
            const trackSpy = vi.spyOn(analiticaModule, "track").mockResolvedValue({});
            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({
                    post: { id: "p1", title: "Cálculo Stewart de Juan Pérez juan@example.com", category: "libros", condition: "usado" },
                }),
            });

            const wrapper = mount(PostForm, {
                props: { post: null },
                global: { plugins: [pinia] },
            });

            await wrapper.find('input[type="text"]').setValue("Cálculo Stewart de Juan Pérez juan@example.com");
            const selects = wrapper.findAll("select");
            await selects[0].setValue("libros");
            await selects[1].setValue("usado");

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            const callArgs = trackSpy.mock.calls[0];
            const eventName = callArgs[0];
            const props = callArgs[1];

            expect(eventName).toBe("publicacion_guardada");
            // Propiedades estrictamente definidas
            expect(Object.keys(props).sort()).toEqual(["categoria", "condicion"]);
            expect(props).toEqual({ categoria: "libros", condicion: "usado" });

            // Verificar explícitamente que NO incluye el título personal, ni correo, ni id, ni usuario
            expect(props.title).toBeUndefined();
            expect(props.titulo).toBeUndefined();
            expect(props.email).toBeUndefined();
            expect(props.name).toBeUndefined();
            expect(props.userId).toBeUndefined();
        });

        it("NO se dispara si la creación de la publicación falla en el servidor", async () => {
            const trackSpy = vi.spyOn(analiticaModule, "track").mockResolvedValue({});
            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ message: "Error al validar publicación" }),
            });

            const wrapper = mount(PostForm, {
                props: { post: null },
                global: { plugins: [pinia] },
            });

            await wrapper.find('input[type="text"]').setValue("Libro");
            const selects = wrapper.findAll("select");
            await selects[0].setValue("libros");
            await selects[1].setValue("usado");

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            // track NO debe haberse ejecutado porque la acción no fue exitosa
            expect(trackSpy).not.toHaveBeenCalled();
        });

        it("NO se dispara al editar una publicación existente", async () => {
            const trackSpy = vi.spyOn(analiticaModule, "track").mockResolvedValue({});
            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({ post: { id: "existente-1", title: "Editado" } }),
            });

            const wrapper = mount(PostForm, {
                props: {
                    post: { id: "existente-1", title: "Libro Original", category: "libros", condition: "nuevo" },
                },
                global: { plugins: [pinia] },
            });

            await wrapper.find("form").trigger("submit.prevent");
            await flushPromises();

            expect(trackSpy).not.toHaveBeenCalled();
        });
    });

    describe("Panel de Analítica (/analitics)", () => {
        it("muestra correctamente las tarjetas de métricas y la lista de últimos eventos", async () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({
                    resumen: {
                        iniciadas: 10,
                        guardadas: 8,
                        tasaFinalizacion: 80,
                        total: 18,
                        conteoPorEvento: {
                            publicacion_iniciada: 10,
                            publicacion_guardada: 8,
                        },
                    },
                    ultimosEventos: [
                        {
                            id: 1,
                            evento: "publicacion_guardada",
                            props: { categoria: "libros", condicion: "usado" },
                            fecha: "2026-11-10T15:30:00.000Z",
                        },
                    ],
                }),
            });

            const pinia = createPinia();
            setActivePinia(pinia);

            const wrapper = mount(AnalyticsView, {
                global: {
                    plugins: [pinia],
                    stubs: {
                        RouterLink: {
                            template: "<a><slot /></a>",
                        },
                    },
                },
            });

            // Esperar que las promesas de onMounted se resuelvan
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(wrapper.text()).toContain("10"); // Iniciadas
            expect(wrapper.text()).toContain("8"); // Guardadas
            expect(wrapper.text()).toContain("80%"); // Tasa de finalización
            expect(wrapper.text()).toContain("18"); // Total
            expect(wrapper.text()).toContain("publicacion_guardada");
        });

        it("renderiza un guion '-' sutil cuando los props están vacíos", async () => {
            const pinia = createPinia();
            setActivePinia(pinia);

            vi.spyOn(globalThis, "fetch").mockResolvedValue({
                ok: true,
                json: async () => ({
                    resumen: {
                        iniciadas: 1,
                        guardadas: 0,
                        tasaFinalizacion: 0,
                        total: 1,
                        conteoPorEvento: { publicacion_iniciada: 1 },
                    },
                    ultimosEventos: [
                        {
                            id: 2,
                            evento: "publicacion_iniciada",
                            props: {},
                            fecha: "2026-11-10T15:30:00.000Z",
                        },
                    ],
                }),
            });

            const wrapper = mount(AnalyticsView, {
                global: {
                    plugins: [pinia],
                    stubs: {
                        RouterLink: {
                            template: "<a><slot /></a>",
                        },
                    },
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(wrapper.text()).toContain("publicacion_iniciada");
            // Debe mostrar el guión "-" para propiedades vacías en la columna de props (3ra columna)
            const cols = wrapper.findAll("tbody tr td");
            expect(cols[2].text()).toBe("-");
        });
    });
});
