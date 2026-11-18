<script setup>
import BaseButton from "@/components/BaseButton.vue";

// Avisos que aparecen arriba de la lista después de una acción:
// intercambio completado, cancelado, oferta enviada o error.
defineProps({
    completedPost: { type: Object, default: null },
    cancelledPost: { type: Object, default: null },
    offerSent: { type: Object, default: null },
    actionError: { type: Object, default: null },
});

defineEmits(["cerrar", "ver-intercambiados", "ver-disponibles"]);
</script>

<template>
    <div
        v-if="completedPost"
        role="status"
        class="alert alert-success shadow-sm mt-6 flex flex-wrap justify-between"
    >
        <div>
            <p class="font-semibold">Intercambio completado: {{ completedPost.title }}</p>
            <p class="text-sm">
                Completaste el intercambio con {{ completedPost.owner }}. La publicación ya no aparece en
                "Disponibles y reservados".
            </p>
        </div>
        <div class="flex gap-2">
            <BaseButton type="button" @click="$emit('ver-intercambiados')" size="sm"
                >Ver intercambiados</BaseButton
            >
            <BaseButton type="button" @click="$emit('cerrar', 'completedPost')" variant="discreto" size="sm"
                >Cerrar</BaseButton
            >
        </div>
    </div>

    <div
        v-if="cancelledPost"
        role="status"
        class="alert alert-info shadow-sm mt-6 flex flex-wrap justify-between"
    >
        <div>
            <p class="font-semibold">Intercambio cancelado: {{ cancelledPost.title }}</p>
            <p class="text-sm">La publicación volvió a estar disponible. El motivo quedó en tu historial.</p>
        </div>
        <BaseButton type="button" @click="$emit('cerrar', 'cancelledPost')" variant="discreto" size="sm"
            >Cerrar</BaseButton
        >
    </div>

    <div
        v-if="offerSent"
        role="status"
        class="alert alert-success shadow-sm mt-6 flex flex-wrap justify-between"
    >
        <div>
            <p class="font-semibold">Oferta enviada: {{ offerSent.title }}</p>
            <p class="text-sm">
                {{ offerSent.owner }} la verá y podrá aceptarla o rechazarla. Si la acepta, el objeto quedará
                reservado para ti.
            </p>
        </div>
        <BaseButton type="button" @click="$emit('cerrar', 'offerSent')" variant="discreto" size="sm"
            >Cerrar</BaseButton
        >
    </div>

    <div
        v-if="actionError"
        role="alert"
        class="alert alert-error shadow-sm mt-6 flex flex-wrap justify-between"
    >
        <div>
            <p class="font-semibold">{{ actionError.title }}</p>
            <p class="text-sm">{{ actionError.text }}</p>
        </div>
        <div class="flex gap-2">
            <BaseButton
                v-if="actionError.canShowAvailable"
                type="button"
                @click="$emit('ver-disponibles')"
                size="sm"
                >Ver disponibles</BaseButton
            >
            <BaseButton type="button" @click="$emit('cerrar', 'actionError')" variant="discreto" size="sm"
                >Cerrar</BaseButton
            >
        </div>
    </div>
</template>
