// Filtros de "Explorar": lo que escribe la persona, los filtros activos en la URL y la vista elegida.
// Los filtros viven en la URL (?q=...&category=...) para que se puedan compartir y recargar.

import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { categoryLabels, conditionLabels, stateLabels } from "@/utils/etiquetas";

// onCargar(filtros): se llama al entrar y cada vez que cambian los filtros de la URL
export function useFiltrosExplorar(onCargar) {
    const route = useRoute();
    const router = useRouter();

    const q = ref("");
    const category = ref("");
    const condition = ref("");
    const state = ref("");
    const showMoreFilters = ref(false);
    let searchTimer = null;

    const filters = computed(() => ({
        q: route.query.q || "",
        category: route.query.category || "",
        condition: route.query.condition || "",
        state: route.query.state || "",
    }));

    // Vista: "todas" las publicaciones o "mis-ofertas" (solo donde envié una oferta)
    const vista = computed(() => (route.query.vista === "mis-ofertas" ? "mis-ofertas" : "todas"));

    function cambiarVista(valor) {
        const query = { ...route.query };
        if (valor === "mis-ofertas") query.vista = valor;
        else delete query.vista;
        router.push({ name: "dashboard", query });
    }

    // Un chip por cada filtro activo, para poder quitarlo con un clic
    const chips = computed(() => {
        const list = [];
        if (filters.value.q) {
            list.push({ key: "q", text: `Búsqueda: ${filters.value.q}` });
        }
        if (filters.value.category) {
            list.push({
                key: "category",
                text: `Categoría: ${categoryLabels[filters.value.category] || filters.value.category}`,
            });
        }
        if (filters.value.condition) {
            list.push({
                key: "condition",
                text: `Condición: ${conditionLabels[filters.value.condition] || filters.value.condition}`,
            });
        }
        if (filters.value.state) {
            list.push({
                key: "state",
                text: `Estado: ${stateLabels[filters.value.state] || filters.value.state}`,
            });
        }
        return list;
    });

    // Filtros que están dentro de "Más filtros"
    const extraFiltersCount = computed(() => {
        let count = 0;
        if (filters.value.category) count++;
        if (filters.value.condition) count++;
        return count;
    });

    function applyFilters(values) {
        const query = {};
        for (const [key, value] of Object.entries(values)) {
            if (value) query[key] = value;
        }
        if (vista.value === "mis-ofertas") query.vista = "mis-ofertas";
        router.push({ name: "dashboard", query });
    }

    function search() {
        clearTimeout(searchTimer);
        applyFilters({
            q: q.value.trim(),
            category: category.value,
            condition: condition.value,
            state: state.value,
        });
    }

    function removeFilter(key) {
        applyFilters({ ...filters.value, [key]: "" });
    }

    function clearFilters() {
        applyFilters({});
    }

    // Buscar solo, 400 ms después de dejar de escribir
    watch(q, (value) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            if (route.name === "dashboard" && value.trim() !== filters.value.q) search();
        }, 400);
    });

    // Cuando cambia la URL, los campos se ajustan a ella y se vuelve a cargar
    watch(
        () => route.query,
        () => {
            if (route.name !== "dashboard") return;
            if (q.value.trim() !== filters.value.q) q.value = filters.value.q;
            category.value = filters.value.category;
            condition.value = filters.value.condition;
            state.value = filters.value.state;
            if (extraFiltersCount.value > 0) showMoreFilters.value = true;
            onCargar(filters.value);
        },
        { immediate: true },
    );

    return {
        q,
        category,
        condition,
        state,
        showMoreFilters,
        filters,
        vista,
        chips,
        extraFiltersCount,
        cambiarVista,
        applyFilters,
        search,
        removeFilter,
        clearFilters,
    };
}
