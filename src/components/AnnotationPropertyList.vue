<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import graphStoreService from '@/services/GraphStoreService';
import { useMainStore } from '@/stores/main';
import { Badge } from '@/components/ui/badge'
import type { Quad_Object } from 'n3';
import TermValue from './TermValue.vue';

const props = defineProps<{
  subject: string;
}>()

const { selected } = storeToRefs(useMainStore());

const groupedAnnotations = computed(() => {
  const annotations = graphStoreService.getSubjectQuads(props.subject);
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
    class="mb-2"
  >
    <div class="text-sm font-medium text-muted-foreground">
      {{ graphStoreService.getLabel(predicate) }}
      <Badge
        variant="outline"
        class="text-xs"
      >{{ graphStoreService.getPrefixedUri(predicate) }}</Badge>
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
