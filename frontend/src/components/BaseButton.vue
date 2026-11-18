<script setup>
import { computed } from "vue";

/*
 * Botón único de la app. TODOS los botones salen de aquí.
 * Para cambiar cómo se ve una familia entera, se edita su línea en VARIANTES
 * (y los colores base se cambian en assets/main.css).
 *
 * Uso:  <BaseButton variant="confirmar" size="sm" @click="...">Confirmar</BaseButton>
 *       <BaseButton as="RouterLink" :to="{ name: 'dashboard' }" variant="accion">Ir</BaseButton>
 */
const VARIANTES = {
    accion: "btn-primary", // acción principal (relleno de color)
    secundario: "btn-outline btn-primary", // acción secundaria (solo borde)
    neutro: "btn-outline", // opciones de igual peso: filtros, Volver / Cancelar intercambio
    confirmar: "btn-success", // confirmar / aceptar
    aviso: "btn-warning", // proponer algo distinto: Contraofertar
    discreto: "btn-ghost", // sin fondo ni borde: Cancelar, Rechazar, Cerrar
    peligro: "btn-error texto-sobre-color", // cerrar sesión / destructivo
    chip: "btn-primary btn-soft", // etiqueta de filtro activo
    icono: "btn-square btn-ghost btn-sm", // solo ícono (el color se le pone con text-info, text-error…)
};
const TAMANOS = { sm: "btn-sm", lg: "btn-lg" };

const props = defineProps({
    variant: { type: String, default: "" },
    size: { type: String, default: "" },
    as: { type: String, default: "button" },
});

const clases = computed(() => ["btn", VARIANTES[props.variant], TAMANOS[props.size]]);
</script>

<template>
    <component :is="as" :class="clases">
        <slot />
    </component>
</template>
