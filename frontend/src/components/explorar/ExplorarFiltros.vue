<script setup>
import BaseButton from "@/components/BaseButton.vue";

// Buscador, selects de filtros y chips de los filtros activos de "Explorar".
// Los valores se editan con v-model; las acciones salen como eventos.
const q = defineModel("q", { type: String, default: "" });
const state = defineModel("state", { type: String, default: "" });
const category = defineModel("category", { type: String, default: "" });
const condition = defineModel("condition", { type: String, default: "" });
const showMoreFilters = defineModel("showMoreFilters", { type: Boolean, default: false });

defineProps({
    chips: { type: Array, default: () => [] },
    extraFiltersCount: { type: Number, default: 0 },
});

defineEmits(["search", "remove-filter", "clear"]);
</script>

<template>
    <form
        @submit.prevent="$emit('search')"
        class="card bg-base-100 shadow-sm border border-base-300 mt-4 p-4 gap-3"
    >
        <div class="flex flex-col lg:flex-row gap-3">
            <input
                v-model="q"
                type="search"
                placeholder="Buscar por título"
                class="input input-bordered w-full lg:flex-1"
            />
            <select v-model="state" @change="$emit('search')" class="select select-bordered w-full lg:w-56">
                <option value="">Disponibles y reservados</option>
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="intercambiado">Intercambiado</option>
            </select>
            <BaseButton
                type="button"
                @click="showMoreFilters = !showMoreFilters"
                :aria-expanded="showMoreFilters"
                variant="neutro"
            >
                {{ showMoreFilters ? "Menos filtros" : "Más filtros" }}
                <span v-if="extraFiltersCount > 0" class="badge badge-primary badge-sm">{{
                    extraFiltersCount
                }}</span>
            </BaseButton>
        </div>
        <div v-if="showMoreFilters" class="flex flex-col lg:flex-row gap-3">
            <select
                v-model="category"
                @change="$emit('search')"
                class="select select-bordered w-full lg:w-52"
            >
                <option value="">Todas las categorías</option>
                <option value="libros">Libros</option>
                <option value="electronica">Electrónica</option>
                <option value="ropa">Ropa</option>
                <option value="otros">Otros</option>
            </select>
            <select
                v-model="condition"
                @change="$emit('search')"
                class="select select-bordered w-full lg:w-52"
            >
                <option value="">Cualquier condición</option>
                <option value="nuevo">Nuevo</option>
                <option value="usado">Usado</option>
            </select>
        </div>
    </form>

    <div v-if="chips.length > 0" class="flex flex-wrap items-center gap-2 mt-4">
        <BaseButton
            v-for="chip in chips"
            :key="chip.key"
            type="button"
            @click="$emit('remove-filter', chip.key)"
            :aria-label="`Quitar filtro ${chip.text}`"
            variant="chip"
            size="sm"
            class="gap-2"
        >
            {{ chip.text }}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="h-5 w-5"
            >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
        </BaseButton>
        <BaseButton type="button" @click="$emit('clear')" variant="neutro" size="sm"
            >Limpiar filtros</BaseButton
        >
    </div>
</template>
