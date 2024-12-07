<script setup lang="ts">
import { ref, computed, inject, type Ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { DataFactory, BlankNode, Quad } from 'n3'
import { useDebounceFn } from '@vueuse/core'
import Select, { type SelectChangeEvent, type SelectFilterEvent } from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useGraphStore } from '@/stores/graph'
import graphStoreService from '@/services/GraphStoreService'
import { vocab } from '@/utils/vocab'

const { namedNode, blankNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    subject: string,
    graphId: string,
    shapeNode?: BlankNode
  }
}>>('dialogRef')

const { reloadTrigger, userGraphs } = storeToRefs(useGraphStore())
const { addQuad, removeQuad } = useGraphStore()

const shapeNode = ref<BlankNode | null>(dialogRef?.value.data.shapeNode || null)
const subjectUri = computed<string>(() => dialogRef?.value.data.subject)
const graphUri = computed<string>(() => dialogRef?.value.data.graphId)
const scopeId = computed<string | undefined>(() => userGraphs.value.find(g => g.node?.value === graphUri.value)?.scopeId)

const path = ref<string>('')
const classOrDatatype = ref<string>('')
const namedNodeSuggestions = ref<string[]>([])

const fetchNamedNodeSuggestions = useDebounceFn(async (event: SelectFilterEvent | { value: string }) => {
  namedNodeSuggestions.value = await graphStoreService.getNamedNodeSuggestions(event.value)
}, 250, { maxWait: 1000 })

onMounted(async () => {
  if (shapeNode.value) {
    const quads = await graphStoreService.getSubjectQuads(shapeNode.value.value, undefined, graphUri.value)
    const pathQuad = quads.find(q => q.predicate.value === vocab.sh.path.value)
    const classQuad = quads.find(q => q.predicate.value === vocab.sh.class.value)
    const datatypeQuad = quads.find(q => q.predicate.value === vocab.sh.datatype.value)

    if (pathQuad) path.value = pathQuad.object.value
    if (classQuad) classOrDatatype.value = classQuad.object.value
    if (datatypeQuad) classOrDatatype.value = datatypeQuad.object.value
  } else {
    namedNodeSuggestions.value = await graphStoreService.getPropertyNodeSuggestions([], graphUri.value)
    shapeNode.value = blankNode()
  }
})

const handlePathChange = async (changeEvent: SelectChangeEvent) => {
  path.value = changeEvent.value
  const range = await graphStoreService.getRangeForProperty(changeEvent.value)
  if (range) {
    classOrDatatype.value = range
  } else {
    classOrDatatype.value = ''
  }
}

const confirmChanges = async () => {
  if (!subjectUri.value || !graphUri.value || !shapeNode.value || !scopeId.value) return

  const newQuads = [
    quad(shapeNode.value, namedNode(vocab.sh.path.value), namedNode(path.value), namedNode(graphUri.value)),
    quad(shapeNode.value, namedNode(vocab.sh.class.value), namedNode(classOrDatatype.value), namedNode(graphUri.value))
  ]

  if (!dialogRef?.value.data.shapeNode) {
    const subClassQuad = quad(namedNode(subjectUri.value), namedNode(vocab.sh.property.value), shapeNode.value, namedNode(graphUri.value))
    newQuads.push(subClassQuad)
  } else {
    const originalQuads = await graphStoreService.getSubjectQuads(shapeNode.value.value, undefined, graphUri.value)
    for (const originalQuad of originalQuads) {
      await removeQuad(originalQuad, scopeId.value)
    }
  }

  for (const newQuad of newQuads) {
    await addQuad(newQuad, scopeId.value)
  }

  reloadTrigger.value++
  dialogRef?.value.close()
}

const cancelChanges = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <div class="flex items-center gap-2 w-full">
      <p class="font-semibold">Path</p>
      <Select
        v-model="path"
        :options="namedNodeSuggestions"
        placeholder="Select Property"
        fluid
        class="grow"
        showClear
        editable
        filter
        @filter="fetchNamedNodeSuggestions"
        @change="handlePathChange"
      />
    </div>
    <div class="flex items-center gap-2 w-full">
      <p class="font-semibold">Class/Datatype</p>
      <Select
        v-model="classOrDatatype"
        :options="namedNodeSuggestions"
        placeholder="Select Class/Datatype"
        fluid
        class="grow"
        showClear
        editable
        filter
        @filter="fetchNamedNodeSuggestions"
      />
    </div>
    <!-- Placeholder for cardinality implementation -->
    <div class="flex justify-end gap-2 mt-4">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        text
        @click="cancelChanges"
      />
      <Button
        type="button"
        label="Confirm"
        severity="secondary"
        outlined
        @click="confirmChanges"
      />
    </div>
  </div>
</template>