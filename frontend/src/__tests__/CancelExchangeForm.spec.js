import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CancelExchangeForm from "../components/CancelExchangeForm.vue";

describe("CancelExchangeForm - simetría visual (Clase 22)", () => {
    it("los botones Volver y Cancelar intercambio tienen el mismo peso visual sin destacar la acción destructiva", () => {
        const wrapper = mount(CancelExchangeForm, {
            props: {
                title: "Calculadora científica",
                otherName: "Admin Demo",
            },
        });

        const volverBtn = wrapper.find('button[type="button"]');
        const cancelarBtn = wrapper.find('button[type="submit"]');

        expect(volverBtn.text()).toBe("Volver");
        expect(cancelarBtn.text()).toBe("Cancelar intercambio");

        expect(volverBtn.classes()).toContain("btn-outline");
        expect(cancelarBtn.classes()).toContain("btn-outline");

        expect(volverBtn.classes()).not.toContain("btn-ghost");
        expect(cancelarBtn.classes()).not.toContain("btn-error");
    });
});
