import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PublicacionCard from "@/components/explorar/PublicacionCard.vue";
import AvisosIntercambio from "@/components/explorar/AvisosIntercambio.vue";

const post = {
    id: 1,
    title: "Calculadora científica",
    category: "electronica",
    condition: "usado",
    state: "disponible",
    owner: { id: 9, name: "Ana" },
};

const botones = (wrapper) => wrapper.findAll("button").map((b) => b.text());

describe("PublicacionCard", () => {
    it("muestra el título, el dueño y las etiquetas en español", () => {
        const wrapper = mount(PublicacionCard, { props: { post } });
        expect(wrapper.text()).toContain("Calculadora científica");
        expect(wrapper.text()).toContain("de Ana");
        expect(wrapper.text()).toContain("Electrónica");
        expect(wrapper.text()).toContain("Usado");
    });

    it("muestra 'Hacer oferta' solo si se puede ofertar, y avisa con un evento", async () => {
        const con = mount(PublicacionCard, { props: { post, puedeOfertar: true } });
        expect(botones(con)).toContain("Hacer oferta");
        await con
            .findAll("button")
            .find((b) => b.text() === "Hacer oferta")
            .trigger("click");
        expect(con.emitted("ofertar")).toHaveLength(1);

        const sin = mount(PublicacionCard, { props: { post, puedeOfertar: false } });
        expect(botones(sin)).not.toContain("Hacer oferta");
    });

    it("si la reserva es mía muestra confirmar y cancelar; si ya confirmé, solo cancelar", () => {
        const reservado = { ...post, state: "reservado", reservedById: 5 };
        const mia = mount(PublicacionCard, { props: { post: reservado, userId: 5 } });
        expect(botones(mia)).toEqual(["Confirmar entrega", "Cancelar intercambio"]);

        const confirmada = mount(PublicacionCard, {
            props: { post: { ...reservado, receiverConfirmed: true }, userId: 5 },
        });
        expect(botones(confirmada)).toEqual(["Cancelar intercambio"]);
        expect(confirmada.text()).toContain("Esperando confirmación de Ana");
    });

    it("si la reserva es de otra persona no ofrece acciones", () => {
        const wrapper = mount(PublicacionCard, {
            props: { post: { ...post, state: "reservado", reservedById: 7 }, userId: 5 },
        });
        expect(botones(wrapper)).toEqual([]);
        expect(wrapper.text()).toContain("Reservado por otra persona");
    });

    it("con una oferta mía muestra 'Ver negociación' y el aviso de contraoferta", async () => {
        const wrapper = mount(PublicacionCard, {
            props: { post, vista: "mis-ofertas", oferta: { id: 3, status: "contraoferta" } },
        });
        expect(wrapper.text()).toContain("Tu oferta: Te enviaron una contraoferta");
        expect(wrapper.text()).toContain("Nueva contraoferta");
        await wrapper
            .findAll("button")
            .find((b) => b.text() === "Ver negociación")
            .trigger("click");
        expect(wrapper.emitted("negociacion")).toHaveLength(1);
    });
});

describe("AvisosIntercambio", () => {
    it("no dibuja nada si no hay avisos", () => {
        const wrapper = mount(AvisosIntercambio);
        expect(wrapper.text()).toBe("");
    });

    it("cada aviso se cierra indicando cuál es", async () => {
        const wrapper = mount(AvisosIntercambio, {
            props: { cancelledPost: { title: "Libro de cálculo" } },
        });
        expect(wrapper.text()).toContain("Intercambio cancelado: Libro de cálculo");
        await wrapper.find("button").trigger("click");
        expect(wrapper.emitted("cerrar")[0]).toEqual(["cancelledPost"]);
    });

    it("el error ofrece 'Ver disponibles' solo cuando corresponde", async () => {
        const wrapper = mount(AvisosIntercambio, {
            props: {
                actionError: { title: "No se pudo", text: "Ya no está disponible", canShowAvailable: true },
            },
        });
        const ver = wrapper.findAll("button").find((b) => b.text() === "Ver disponibles");
        await ver.trigger("click");
        expect(wrapper.emitted("ver-disponibles")).toHaveLength(1);
    });
});
