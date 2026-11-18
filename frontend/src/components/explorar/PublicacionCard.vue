<script setup>
import BaseButton from "@/components/BaseButton.vue";
import StateBadge from "@/components/StateBadge.vue";
import { categoryLabels, conditionLabels, estadoOferta } from "@/utils/etiquetas";

// Tarjeta de una publicación en "Explorar". No decide nada: muestra lo que recibe
// y avisa con eventos cuando la persona pulsa un botón.
defineProps({
    post: { type: Object, required: true },
    // Vista elegida: "todas" o "mis-ofertas"
    vista: { type: String, default: "todas" },
    // Oferta más reciente que envié por esta publicación (si existe)
    oferta: { type: Object, default: null },
    // true si se puede mostrar el botón "Hacer oferta"
    puedeOfertar: { type: Boolean, default: false },
    userId: { type: [Number, String], default: null },
});

defineEmits(["ofertar", "negociacion", "confirmar", "cancelar"]);
</script>

<template>
    <div class="card bg-base-100 shadow-sm border border-base-300 p-4 flex flex-col gap-2">
        <h2 class="texto-titulo-tarjeta">{{ post.title }}</h2>
        <p class="texto-secundario">de {{ post.owner?.name }}</p>
        <div class="flex flex-wrap gap-2">
            <span class="badge badge-outline badge-sm">
                {{ categoryLabels[post.category] || post.category }}
            </span>
            <span class="badge badge-outline badge-sm">
                {{ conditionLabels[post.condition] || post.condition }}
            </span>
        </div>
        <div>
            <StateBadge :state="post.state" />
        </div>
        <p v-if="vista === 'mis-ofertas'" class="text-sm font-semibold">
            Tu oferta: {{ estadoOferta[oferta.status] || oferta.status }}
        </p>
        <div v-if="oferta" class="flex flex-wrap items-center gap-2">
            <span v-if="oferta.status === 'contraoferta'" class="badge badge-warning badge-sm"
                >Nueva contraoferta</span
            >
            <BaseButton type="button" @click="$emit('negociacion')" variant="secundario" size="sm"
                >Ver negociación</BaseButton
            >
        </div>
        <div v-if="puedeOfertar">
            <BaseButton type="button" @click="$emit('ofertar')" variant="accion" size="sm"
                >Hacer oferta</BaseButton
            >
        </div>
        <template v-else-if="post.state === 'reservado' && post.reservedById === userId">
            <p class="text-xs font-semibold">Reservado por ti</p>
            <p v-if="post.ownerConfirmed" class="text-xs text-base-content/70">
                {{ post.owner?.name }} ya confirmó la entrega.
            </p>
            <p v-if="post.receiverConfirmed" class="text-xs font-semibold text-success">
                Confirmaste la entrega. Esperando confirmación de {{ post.owner?.name }}.
            </p>
            <div class="flex flex-wrap gap-2">
                <BaseButton
                    v-if="!post.receiverConfirmed"
                    type="button"
                    @click="$emit('confirmar')"
                    variant="confirmar"
                    size="sm"
                    >Confirmar entrega</BaseButton
                >
                <BaseButton type="button" @click="$emit('cancelar')" variant="discreto" size="sm"
                    >Cancelar intercambio</BaseButton
                >
            </div>
        </template>
        <p v-else-if="post.state === 'reservado'" class="texto-etiqueta">Reservado por otra persona</p>
    </div>
</template>
