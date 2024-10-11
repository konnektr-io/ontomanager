<script setup lang="ts">
import { useGraphStore } from '@/stores/graph-store';
import type { Term } from 'n3';
import Tag from 'primevue/tag';
import type { HTMLAttributes } from 'vue';

defineProps<{
  term: Term;
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{
  (e: 'clickUri', value: string): void
}>()

const { getPrefixedUri } = useGraphStore();
</script>

<template>
  <div class="mb-1">
    <Tag
      v-if="term.termType === 'NamedNode'"
      :value="getPrefixedUri(term.value)"
      class="cursor-pointer"
      @click="emit('clickUri', term.value)"
    ></Tag>
    <div v-else>{{ term.value }}</div>
  </div>
</template>
