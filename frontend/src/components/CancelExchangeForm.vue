<script setup>
import { ref, computed } from "vue";

const props = defineProps({
    // Título del objeto del intercambio
    title: {
        type: String,
        required: true,
    },
    // Nombre de la otra parte, para dar contexto
    otherName: {
        type: String,
        default: "",
    },
    // Error devuelto por el servidor al intentar cancelar
    serverError: {
        type: String,
        default: "",
    },
    submitting: {
        type: Boolean,
        default: false,
    },
});

// "submit" envía el motivo ya validado
const emit = defineEmits(["submit", "cancel"]);

const MIN = 5;
const MAX = 200;

// Motivos sugeridos: al elegir uno, el campo se rellena con esa respuesta por defecto (editable)
const suggestions = [
    { value: "horario", text: "No pudimos coincidir en horario o lugar de entrega." },
    { value: "interes", text: "Ya no necesito o ya no tengo el objeto." },
    { value: "estado", text: "El objeto no está en el estado que acordamos." },
    { value: "otro", text: "" },
];

const suggestion = ref("");
const reason = ref("");
const error = ref("");

const remaining = computed(() => MAX - reason.value.length);

function applySuggestion() {
    const selected = suggestions.find((s) => s.value === suggestion.value);
    reason.value = selected ? selected.text : "";
    error.value = "";
}

function submit() {
    const text = reason.value.trim();
    if (!text) {
        error.value = "Escribe el motivo de la cancelación.";
        return;
    }
    if (text.length < MIN) {
        error.value = `El motivo debe tener al menos ${MIN} caracteres.`;
        return;
    }
    error.value = "";
    emit("submit", text);
}

const shownError = computed(() => error.value || props.serverError);
</script>

<template>
    <form @submit.prevent="submit" class="flex flex-col gap-3" novalidate>
        <p class="text-sm text-base-content/70">
            Vas a cancelar el intercambio de <strong>{{ title }}</strong><template v-if="otherName">
                con {{ otherName }}</template>. La publicación volverá a estar disponible y el motivo quedará en
            el historial de ambas personas.
        </p>

        <label class="form-control w-full">
            <span class="label-text font-medium mb-1">Motivo sugerido</span>
            <select v-model="suggestion" @change="applySuggestion" class="select select-bordered w-full"
                aria-label="Motivo sugerido">
                <option value="">Elige una respuesta de ejemplo (opcional)</option>
                <option value="horario">No pudimos coincidir en horario o lugar</option>
                <option value="interes">Ya no necesito o ya no tengo el objeto</option>
                <option value="estado">El objeto no está en el estado acordado</option>
                <option value="otro">Otro motivo</option>
            </select>
        </label>

        <label class="form-control w-full">
            <span class="label-text font-medium mb-1">Descripción del motivo</span>
            <textarea v-model="reason" :maxlength="MAX" rows="3" aria-label="Descripción del motivo"
                placeholder="Ej. No pudimos coincidir en horario o lugar de entrega."
                class="textarea textarea-bordered w-full text-sm focus:textarea-primary"></textarea>
            <span class="text-xs text-base-content/60 text-right mt-1">{{ remaining }} caracteres restantes</span>
        </label>

        <div v-if="shownError" role="alert" class="alert alert-error shadow-sm text-sm py-2 px-3">
            <span>{{ shownError }}</span>
        </div>

        <div class="modal-action mt-2">
            <button type="button" @click="emit('cancel')" :disabled="submitting" class="btn btn-outline">Volver</button>
            <button type="submit" :disabled="submitting" class="btn btn-outline">Cancelar intercambio</button>
        </div>
    </form>
</template>
