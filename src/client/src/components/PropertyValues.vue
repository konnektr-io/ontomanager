<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Quad_Object } from 'n3'
import Button from 'primevue/button'
import { useDialog } from 'primevue/usedialog'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import PropertyValue from './PropertyValue.vue'
import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue'

const props = defineProps<{
  subject: string;
}>()

const { selectedOntology, editMode } = storeToRefs(useGraphStore())

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

const dialog = useDialog()
const openDialog = () => {
  if (!selectedOntology.value) return
  dialog.open(EditPredicateObjectsDialog, {
    props: {
      header: 'New Annotation',
      style: {
        width: '50vw',
      },
      breakpoints: {
        '960px': '75vw',
        '640px': '90vw'
      },
      modal: true
    },
    data: {
      subjectUri: props.subject,
      graphUri: selectedOntology.value.node?.value
    }
  })
}
</script>

<template>
  <div class="flex-col">
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
    <div>
      <Button
        v-if="editMode"
        icon="pi pi-pencil"
        size="small"
        label="Add Annotation"
        text
        @click="() => openDialog()"
      />
    </div>
  </div>
</template>
