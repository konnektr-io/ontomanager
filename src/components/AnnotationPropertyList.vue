<script setup lang="ts">
import { computed } from 'vue';
import graphStoreService from '@/services/GraphStoreService';
import { Badge } from '@/components/ui/badge'
const props = defineProps<{
    subject: string;
}>()

const groupedAnnotations = computed(() => {
    const annotations = graphStoreService.getSubjectAnnotationQuads(props.subject);
    return annotations.reduce((acc, annotation) => {
        const predicate = annotation.predicate.value;
        if (!acc[predicate]) {
            acc[predicate] = [];
        }
        acc[predicate].push(annotation.object.value);
        return acc;
    }, {} as Record<string, string[]>);
});
</script>

<template>
    <div
        v-for="(objects, predicate) in groupedAnnotations"
        :key="`${predicate}`"
        class="mb-2"
    >
        <div class="text-sm font-medium text-muted-foreground">
            {{ graphStoreService.getLabel(predicate) }}
            <Badge variant="outline">{{ predicate }}</Badge>
        </div>
        <div
            v-for="object of objects"
            :key="object"
            class="text-sm"
        >{{ object }}</div>
    </div>
</template>
