<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import type { OTerm, Quad_Object } from 'n3'
import { useDialog } from 'primevue/usedialog'
import Button from 'primevue/button'
import Panel from 'primevue/panel'
import { useGraphStore } from '@/stores/graph'
import TermValue from './TermValue.vue'
import EditPredicateObjectsDialog from './EditPredicateObjectsDialog.vue'

const props = defineProps<{
  subject: OTerm;
}>()

const dialog = useDialog()
const { selectedOntology, selectedResource, editMode } = storeToRefs(useGraphStore())
const { getSubjectQuads, getLabel } = useGraphStore()

type GroupedAnnotations = Record<string, {
  editable: boolean;
  objects: Quad_Object[];
}>

const groupedAnnotations = computed(() => {
  const annotations = getSubjectQuads(props.subject)
  return annotations.reduce<GroupedAnnotations>((acc, annotation) => {
    const graphId = annotation.graph.value
    const editable = (selectedOntology.value && graphId === selectedOntology.value.url) ?? false
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
})

const openDialog = (predicate: string) => {
  if (!selectedOntology.value) return
  dialog.open(EditPredicateObjectsDialog, {
    props: {
      header: 'Edit Objects',
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
      subject: props.subject,
      predicate,
      graphId: selectedOntology.value.url
    }
  })
}
</script>

<template>
  <div
    v-for="(predicateObjects, predicate) in groupedAnnotations"
    :key="`${predicate}`"
    class="text-sm mb-1"
  >
    <div class="flex items-center gap-2">
      <div
        v-tooltip="predicate"
        class="text-sm font-medium !text-muted-foreground cursor-pointer"
        @click="selectedResource = predicate"
      >
        {{ getLabel(predicate) }}
      </div>
      <Button
        v-if="editMode && predicateObjects.editable"
        icon="pi pi-pencil"
        size="small"
        text
        rounded
        @click="() => openDialog(predicate)"
      />
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <TermValue
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'NamedNode')"
        :key="object.id"
        :term="object"
        class="text-sm"
        @click-uri="selectedResource = object.value"
      >
      </TermValue>
    </div>
    <div class="gap-1">
      <TermValue
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'Literal')"
        :key="object.id"
        :term="object"
        class="text-sm"
        @click-uri="selectedResource = object.value"
      >
      </TermValue>
    </div>
    <div class="pl-6 pt-1 flex flex-col gap-1">
      <Panel
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'BlankNode')"
        :key="object.id"
        :pt:header:class="`pb-0 pt-2`"
        :pt:content:class="`pb-2`"
        class="py-0"
      >
        <AnnotationPropertyList :subject="object" />
      </Panel>
      <!-- <div
        v-for="object of predicateObjects.objects.filter(object => object.termType === 'BlankNode')"
        :key="object.id"
      >
        <div
          v-for="quad of getQuads(object, null, null, null)"
          :key="`${quad.predicate.value}_${quad.object.value}`"
        >
          <div class="flex items-center gap-2">
            <div
              v-tooltip="quad.predicate.value"
              class="text-sm font-medium text-muted-foreground cursor-pointer"
              @click="selectedResource = quad.predicate.value"
            >
              {{ getLabel(quad.predicate.value) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <TermValue
              :term="quad.object"
              class="text-sm"
            >
            </TermValue>
          </div>
        </div>
      </div> -->
    </div>
  </div>
</template>
