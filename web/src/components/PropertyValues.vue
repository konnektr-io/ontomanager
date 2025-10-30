<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Quad_Object } from 'n3'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import PropertyValue from './PropertyValue.vue'
// import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue'

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

// TODO: Implement dialog pattern when EditPredicateObjectsDialog is migrated
const openDialog = () => {
  if (!selectedOntology.value) return
  console.log('Open add annotation dialog - to be implemented')
  // Will need to use Dialog + DialogTrigger pattern with EditPredicateObjectsDialog
}
</script>

<template>
  <div class="flex-col">
    <div>
      <Button
        v-if="editMode"
        variant="ghost"
        size="sm"
        @click="openDialog"
      >
        <Plus class="mr-2 h-4 w-4" />
        Add Annotation
      </Button>
    </div>
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
