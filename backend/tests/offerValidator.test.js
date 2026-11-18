const {
    validarNuevaOferta,
    validarContraoferta,
    validarRespuesta,
} = require("../src/validators/offerValidator");

describe("offerValidator", () => {
    describe("validarNuevaOferta", () => {
        it("acepta una oferta solo con mensaje", () => {
            expect(validarNuevaOferta({ message: "Te ofrezco mi libro" })).toBeNull();
        });

        it("acepta una oferta solo con producto", () => {
            expect(validarNuevaOferta({ offeredPostId: 3 })).toBeNull();
        });

        it("rechaza una oferta sin mensaje ni producto", () => {
            expect(validarNuevaOferta({ message: "   " })).toMatch(/Escribe un mensaje o elige un producto/);
            expect(validarNuevaOferta(undefined)).toMatch(/Escribe un mensaje o elige un producto/);
        });

        it("rechaza un mensaje de más de 200 caracteres", () => {
            expect(validarNuevaOferta({ message: "a".repeat(201) })).toMatch(/200 caracteres/);
            expect(validarNuevaOferta({ message: "a".repeat(200) })).toBeNull();
        });
    });

    describe("validarContraoferta y validarRespuesta", () => {
        it("piden un mensaje con el texto propio de cada caso", () => {
            expect(validarContraoferta("")).toBe("Escribe un mensaje para la contraoferta.");
            expect(validarRespuesta(undefined)).toBe("Escribe un mensaje para responder.");
        });

        it("limitan el mensaje a 200 caracteres", () => {
            expect(validarContraoferta("a".repeat(201))).toMatch(/200 caracteres/);
            expect(validarRespuesta("ok")).toBeNull();
        });
    });
});
