<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
    subtitle: {
        type: String,
        default: "",
    }
});
</script>

<template>
    <div>
        <h1 class="texto-titulo-pagina">{{ title }}</h1>
        <p v-if="subtitle"  class="texto-secundario mt-1">
            {{ subtitle }}.
        </p>
    </div>
</template>