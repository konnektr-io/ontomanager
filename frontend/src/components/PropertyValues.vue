<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Quad_Object } from 'n3'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import PropertyValue from './PropertyValue.vue'
import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'

const props = defineProps<{
  subject: string
}>()

const { selectedOntology, editMode, reloadTrigger } = storeToRefs(useGraphStore())

type GroupedPropertyValues = Record<
  string,
  {
    editable: boolean
    objects: Quad_Object[]
  }
>

const getGroupedObjectValues = async () => {
  const annotations = await graphStoreService.getSubjectQuads(props.subject)
  return annotations.reduce<GroupedPropertyValues>((acc, annotation) => {
    const editable =
      (selectedOntology.value && annotation.graph.value === selectedOntology.value.node?.value) ??
      false
    const predicate = annotation.predicate.value
    if (annotation.object.termType === 'BlankNode') return acc
    if (!acc[predicate]) {
      acc[predicate] = {
        objects: [],
        editable
      }
    }
    acc[predicate].objects.push(annotation.object)
    return acc
  }, {} as Record<string, { editable: boolean; objects: Quad_Object[] }>)
}

const groupedObjectValues = ref<GroupedPropertyValues>({})
watch(
  [() => props.subject, () => selectedOntology.value, reloadTrigger],
  async () => {
    groupedObjectValues.value = await getGroupedObjectValues()
  },
  { immediate: true }
)


const addAnnotationDialogOpen = ref(false)
</script>

<template>
  <div class="flex-col">
    <Dialog v-model:open="addAnnotationDialogOpen">
      <DialogTrigger
        v-if="editMode"
        as-child
      >
        <Button
          variant="ghost"
          size="sm"
        >
          <Plus class="mr-2 h-4 w-4" />
          Add Annotation
        </Button>
      </DialogTrigger>
      <EditPredicateObjectsDialog
        v-if="selectedOntology?.node?.value"
        :subject-uri="subject"
        :graph-uri="selectedOntology.node.value"
        @confirm="addAnnotationDialogOpen = false; reloadTrigger++"
        @cancel="addAnnotationDialogOpen = false"
      />
    </Dialog>
    <div
      v-for="(predicateObjects, predicate) in groupedObjectValues"
      :key="`${predicate}`"
      class="text-sm mb-1"
    >
      <PropertyValue
        :subject="subject"
        :predicate="predicate"
        :predicate-objects="predicateObjects"
      />
    </div>
  </div>
</template>
