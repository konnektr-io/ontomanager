<script setup lang="ts">
import { computed } from 'vue'
import type { Term } from 'n3'
import Tag from 'primevue/tag'
import { useGraphStore } from '@/stores/graph'
import { vocab } from '@/stores/vocab'

const props = defineProps<{
  term: Term;
}>()
const emit = defineEmits<{
  (e: 'clickUri', value: string): void
}>()

const { getPrefixedUri, getPropertyRangeValueRestrictions } = useGraphStore()
const restrictionRangeValues = computed(() => {
  if (props.term.termType === 'BlankNode') {
    return getPropertyRangeValueRestrictions(props.term)
  } else {
    return []
  }
})
</script>

<template>
  <div>
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
        v-if="term.language"
        :value="term.language"
        class="text-xs"
      />
      <Tag
        v-if="term.datatypeString && !term.datatype.equals(vocab.rdf.langString)"
        :value="getPrefixedUri(term.datatypeString)"
        v-tooltip="term.datatypeString"
        class="text-xs"
      />
    </div>
    <div v-else-if="term.termType === 'BlankNode'">
      <div
        v-for="restrictionRangeValue of restrictionRangeValues"
        :key="`${restrictionRangeValue.predicate.value}_${restrictionRangeValue.object.value}`"
        class="flex items-center gap-2"
      >

        <Tag
          :value="getPrefixedUri(restrictionRangeValue.predicate.value)"
          v-tooltip="restrictionRangeValue.predicate.value"
          class="text-xs"
        />
        <Tag
          :value="getPrefixedUri(restrictionRangeValue.object.value)"
          v-tooltip="restrictionRangeValue.object.value"
        />
      </div>
    </div>
    <div v-else>{{ term.value }}</div>
  </div>
</template>
