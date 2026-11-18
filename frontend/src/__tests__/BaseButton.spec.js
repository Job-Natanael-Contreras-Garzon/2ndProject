import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BaseButton from "../components/BaseButton.vue";

describe("BaseButton - familias de botones (Clase 23)", () => {
    it("siempre lleva la clase btn y respeta el contenido y los atributos", () => {
        const wrapper = mount(BaseButton, {
            props: { variant: "accion" },
            attrs: { type: "submit", disabled: true, class: "mt-4" },
            slots: { default: "Publicar" },
        });
        expect(wrapper.element.tagName).toBe("BUTTON");
        expect(wrapper.text()).toBe("Publicar");
        expect(wrapper.attributes("type")).toBe("submit");
        expect(wrapper.attributes("disabled")).toBeDefined();
        expect(wrapper.classes()).toEqual(expect.arrayContaining(["btn", "btn-primary", "mt-4"]));
    });

    it("cada variante se traduce a las clases de su familia", () => {
        const esperadas = {
            accion: ["btn-primary"],
            secundario: ["btn-outline", "btn-primary"],
            neutro: ["btn-outline"],
            confirmar: ["btn-success"],
            aviso: ["btn-warning"],
            discreto: ["btn-ghost"],
            peligro: ["btn-error", "texto-sobre-color"],
            chip: ["btn-primary", "btn-soft"],
            icono: ["btn-square", "btn-ghost", "btn-sm"],
        };
        for (const [variant, clases] of Object.entries(esperadas)) {
            const wrapper = mount(BaseButton, { props: { variant } });
            expect(wrapper.classes()).toEqual(expect.arrayContaining(["btn", ...clases]));
        }
    });

    it("el tamaño se pone aparte de la familia", () => {
        expect(mount(BaseButton, { props: { variant: "confirmar", size: "sm" } }).classes()).toContain("btn-sm");
        expect(mount(BaseButton, { props: { variant: "accion", size: "lg" } }).classes()).toContain("btn-lg");
        expect(mount(BaseButton, { props: { variant: "accion" } }).classes()).not.toContain("btn-sm");
    });

    it("sin variante queda como botón estándar de daisyUI", () => {
        expect(mount(BaseButton).classes()).toEqual(["btn"]);
    });

    it("las acciones de peso opuesto no comparten familia (Cancelar vs Confirmar)", () => {
        const confirmar = mount(BaseButton, { props: { variant: "confirmar" } }).classes();
        const discreto = mount(BaseButton, { props: { variant: "discreto" } }).classes();
        expect(confirmar).not.toEqual(discreto);
    });
});
