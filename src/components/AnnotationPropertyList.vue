<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import type { Quad_Object } from 'n3';
import { useMainStore } from '@/stores/main';
import TermValue from './TermValue.vue';
import { useGraphStore } from '@/stores/graph-store';

const props = defineProps<{
  subject: string;
}>()

const { selected } = storeToRefs(useMainStore());
const { getSubjectQuads, getLabel, getPrefixedUri } = useGraphStore();

const groupedAnnotations = computed(() => {
  const annotations = getSubjectQuads(props.subject);
  return annotations.reduce((acc, annotation) => {
    const predicate = annotation.predicate.value;
    if (!acc[predicate]) {
      acc[predicate] = [];
    }
    acc[predicate].push(annotation.object);
    return acc;
  }, {} as Record<string, Quad_Object[]>);
});
</script>

<template>
  <div
    v-for="(objects, predicate) in groupedAnnotations"
    :key="`${predicate}`"
    class="text-sm mb-2"
  >
    <div
      v-tooltip="getPrefixedUri(predicate)"
      class="text-sm font-medium text-muted-foreground cursor-pointer"
      @click="selected = predicate"
    >
      {{ getLabel(predicate) }}
    </div>
    <TermValue
      v-for="object of objects"
      :key="object.value"
      :term="object"
      class="text-sm"
      @click-uri="selected = object.value"
    >
    </TermValue>
  </div>
</template>
