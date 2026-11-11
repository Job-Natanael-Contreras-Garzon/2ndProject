const analyticsController = require("../src/controllers/analytics.controller");
const { sequelize, Evento } = require("../src/models");

jest.mock("../src/database/db", () => {
    const { Sequelize } = require("sequelize");
    return new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false });
});

describe("API de Analítica y Registro de Eventos", () => {
    function buildRes() {
        return {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    }

    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await Evento.destroy({ where: {} });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    test("1. POST /eventos guarda exitosamente un evento y retorna 201", async () => {
        const req = {
            body: {
                evento: "publicacion_iniciada",
                props: { origen: "mis_publicaciones" },
            },
        };
        const res = buildRes();

        await analyticsController.registrarEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const data = res.json.mock.calls[0][0];
        expect(data.success).toBe(true);
        expect(data.evento).toBeDefined();
        expect(data.evento.evento).toBe("publicacion_iniciada");
        expect(data.evento.props).toEqual({ origen: "mis_publicaciones" });
        expect(data.evento.fecha).toBeDefined();

        // Verificar persistencia en base de datos
        const enDb = await Evento.findByPk(data.evento.id);
        expect(enDb).not.toBeNull();
        expect(enDb.evento).toBe("publicacion_iniciada");
    });

    test("2. POST /eventos rechaza payloads sin el campo evento (400 Bad Request)", async () => {
        const req = {
            body: {
                props: { categoria: "libros" },
            },
        };
        const res = buildRes();

        await analyticsController.registrarEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const data = res.json.mock.calls[0][0];
        expect(data.message).toMatch(/requerido/i);
    });

    test("3. POST /eventos guarda evento publicacion_guardada con propiedades mínimas", async () => {
        const req = {
            body: {
                evento: "publicacion_guardada",
                props: { categoria: "electronica", condicion: "nuevo" },
                fecha: "2026-11-10T12:00:00.000Z",
            },
        };
        const res = buildRes();

        await analyticsController.registrarEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const data = res.json.mock.calls[0][0];
        expect(data.evento.props).toEqual({ categoria: "electronica", condicion: "nuevo" });
        expect(data.evento.fecha).toBe("2026-11-10T12:00:00.000Z");
    });

    test("4. GET /eventos/resumen calcula conteos agrupados y tasa de finalización correctamente", async () => {
        // Creamos 4 eventos de inicio y 2 de éxito (tasa de 50%)
        await Evento.create({ evento: "publicacion_iniciada", props: { origen: "mis_publicaciones" }, fecha: new Date().toISOString() });
        await Evento.create({ evento: "publicacion_iniciada", props: { origen: "mis_publicaciones" }, fecha: new Date().toISOString() });
        await Evento.create({ evento: "publicacion_iniciada", props: { origen: "mis_publicaciones" }, fecha: new Date().toISOString() });
        await Evento.create({ evento: "publicacion_iniciada", props: { origen: "mis_publicaciones" }, fecha: new Date().toISOString() });

        await Evento.create({ evento: "publicacion_guardada", props: { categoria: "libros", condicion: "usado" }, fecha: new Date().toISOString() });
        await Evento.create({ evento: "publicacion_guardada", props: { categoria: "ropa", condicion: "nuevo" }, fecha: new Date().toISOString() });

        const req = {};
        const res = buildRes();

        await analyticsController.obtenerResumen(req, res);

        const data = res.json.mock.calls[0][0];
        expect(data.resumen.iniciadas).toBe(4);
        expect(data.resumen.guardadas).toBe(2);
        expect(data.resumen.tasaFinalizacion).toBe(50);
        expect(data.resumen.total).toBe(6);
        expect(data.resumen.conteoPorEvento["publicacion_iniciada"]).toBe(4);
        expect(data.resumen.conteoPorEvento["publicacion_guardada"]).toBe(2);
        expect(data.ultimosEventos).toHaveLength(6);
    });

    test("5. GET /eventos/resumen maneja división por cero cuando no hay publicaciones iniciadas", async () => {
        const req = {};
        const res = buildRes();

        await analyticsController.obtenerResumen(req, res);

        const data = res.json.mock.calls[0][0];
        expect(data.resumen.iniciadas).toBe(0);
        expect(data.resumen.guardadas).toBe(0);
        expect(data.resumen.tasaFinalizacion).toBe(0);
        expect(data.resumen.total).toBe(0);
        expect(data.ultimosEventos).toEqual([]);
    });

    test("6. GET /eventos/resumen limita los últimos eventos a 20 ordenados descendentemente", async () => {
        for (let i = 1; i <= 25; i++) {
            await Evento.create({
                evento: "publicacion_iniciada",
                props: { num: i },
                fecha: new Date(2026, 0, i).toISOString(),
            });
        }

        const req = {};
        const res = buildRes();

        await analyticsController.obtenerResumen(req, res);

        const data = res.json.mock.calls[0][0];
        expect(data.ultimosEventos).toHaveLength(20);
        // El primero debe ser el ID más reciente (25)
        expect(data.ultimosEventos[0].props.num).toBe(25);
    });

    test("7. POST /eventos rechaza nombres de evento que no sigan convención snake_case (400 Bad Request)", async () => {
        const nombresInvalidos = [
            "PublicacionIniciada",
            "publicacion iniciada",
            "publicacion",
            "PUBLICACION_INICIADA",
            "publicacion-iniciada",
        ];

        for (const eventoInvalido of nombresInvalidos) {
            const req = { body: { evento: eventoInvalido, props: {} } };
            const res = buildRes();

            await analyticsController.registrarEvento(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            const data = res.json.mock.calls[0][0];
            expect(data.message).toMatch(/convención|snake_case/i);
        }
    });

    test("8. POST /eventos sanitiza estrictamente y remueve datos personales (PII)", async () => {
        const req = {
            body: {
                evento: "publicacion_guardada",
                props: {
                    categoria: "libros",
                    condicion: "nuevo",
                    // PII que debe ser filtrada
                    email: "juan@example.com",
                    name: "Juan Pérez",
                    userId: 99,
                    title: "Libro de Juan",
                    description: "Descripción privada",
                    token: "secret-token-123",
                },
            },
        };
        const res = buildRes();

        await analyticsController.registrarEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const data = res.json.mock.calls[0][0];
        expect(data.evento.props).toEqual({
            categoria: "libros",
            condicion: "nuevo",
        });

        // Verificamos explícitamente que en la base de datos tampoco se guardó PII
        const enDb = await Evento.findByPk(data.evento.id);
        expect(enDb.props.email).toBeUndefined();
        expect(enDb.props.name).toBeUndefined();
        expect(enDb.props.userId).toBeUndefined();
        expect(enDb.props.title).toBeUndefined();
        expect(enDb.props.token).toBeUndefined();
    });

    test("9. POST /eventos maneja props no-objeto o nulas convirtiéndolas a objeto vacío {}", async () => {
        const req = {
            body: {
                evento: "publicacion_iniciada",
                props: "cadena_no_valida",
            },
        };
        const res = buildRes();

        await analyticsController.registrarEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const data = res.json.mock.calls[0][0];
        expect(data.evento.props).toEqual({});
    });

    test("10. POST /eventos asigna fecha ISO válida cuando fecha viene vacía o inválida", async () => {
        const req = {
            body: {
                evento: "publicacion_iniciada",
                props: { origen: "mis_publicaciones" },
                fecha: "fecha-invalida",
            },
        };
        const res = buildRes();

        await analyticsController.registrarEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const data = res.json.mock.calls[0][0];
        expect(isNaN(Date.parse(data.evento.fecha))).toBe(false);
    });
});
