<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Quad_Object } from 'n3'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import PropertyValue from './PropertyValue.vue'

const props = defineProps<{
  subject: string;
}>()

const { selectedOntology } = storeToRefs(useGraphStore())

type GroupedPropertyValues = Record<string, {
  editable: boolean;
  objects: Quad_Object[];
}>


const getGroupedObjectValues = async () => {
  const annotations = await graphStoreService.getSubjectQuads(props.subject)
  return annotations.reduce<GroupedPropertyValues>((acc, annotation) => {
    const editable = (selectedOntology.value && annotation.graph.value === selectedOntology.value.node?.value) ?? false
    const predicate = annotation.predicate.value
    if (!acc[predicate]) {
      acc[predicate] = {
        objects: [],
        editable
      }
    }
    acc[predicate].objects.push(annotation.object)
    return acc
  }, {} as Record<string, { editable: boolean, objects: Quad_Object[] }>)
}

const groupedObjectValues = ref<GroupedPropertyValues>({})
watch([
  () => props.subject,
  () => selectedOntology.value,
], async () => {
  groupedObjectValues.value = await getGroupedObjectValues()
}, { immediate: true })

</script>

<template>
  <div
    v-for="(predicateObjects, predicate) in groupedObjectValues"
    :key="`${predicate}`"
    class="text-sm mb-1"
  >
    <PropertyValue
      :subject="props.subject"
      :predicate="predicate"
      :predicateObjects="predicateObjects"
    />
  </div>
</template>
