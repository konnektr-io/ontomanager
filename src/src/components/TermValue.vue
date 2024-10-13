<script setup lang="ts">
import { useGraphStore } from '@/stores/graph-store'
import type { Term } from 'n3'
import Tag from 'primevue/tag'

defineProps<{
  term: Term;
}>()
const emit = defineEmits<{
  (e: 'clickUri', value: string): void
}>()

const { getPrefixedUri } = useGraphStore()
</script>

<template>
  <div class="mb-1">
    <Tag
      v-if="term.termType === 'NamedNode'"
      v-tooltip="term.value"
      :value="getPrefixedUri(term.value)"
      class="cursor-pointer"
      @click="emit('clickUri', term.value)"
    ></Tag>
    <div
      v-else-if="term.termType === 'Literal'"
      class="flex items-center gap-2"
    >{{ term.value }}
      <Tag
        :value="term.language"
        class="text-xs"
      />
      <Tag
        :value="getPrefixedUri(term.datatypeString)"
        v-tooltip="term.datatypeString"
        class="text-xs"
      />
    </div>
    <div v-else>{{ term.value }}</div>
  </div>
</template>
