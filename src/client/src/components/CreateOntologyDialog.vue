<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { DataFactory, type Quad } from 'n3'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { vocab } from '@/utils/vocab'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'

const { namedNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: { graphId: string }
}>>('dialogRef')

const graphUri = computed<string>(() => dialogRef?.value.data.graphId)

const { addQuad } = useGraphStore()
const reloadTrigger = ref(0)

interface EditableObject {
  predicate: string;
  value: string;
}

const vannPredicates: EditableObject[] = [
  { predicate: vocab.vann.preferredNamespacePrefix.value, value: '' },
  { predicate: vocab.vann.preferredNamespaceUri.value, value: '' }
]

const dcPredicates: EditableObject[] = [
  { predicate: vocab.dc.title.value, value: '' },
  { predicate: vocab.dc.description.value, value: '' },
  { predicate: vocab.dc.creator.value, value: '' },
  { predicate: vocab.dc.publisher.value, value: '' },
  { predicate: vocab.dc.created.value, value: '' },
  { predicate: vocab.dc.modified.value, value: '' }
]

const quads = ref<Quad[]>([])

const confirmCreation = async () => {
  const preferredNamespaceUri = vannPredicates.find(p => p.predicate === vocab.vann.preferredNamespaceUri.value)?.value
  if (!preferredNamespaceUri || !graphUri.value) return

  // Add vann predicates
  vannPredicates.forEach(({ predicate, value }) => {
    if (value) {
      quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(predicate), literal(value), namedNode(graphUri.value)))
    }
  })

  // Add dc predicates
  dcPredicates.forEach(({ predicate, value }) => {
    if (value) {
      quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(predicate), literal(value), namedNode(graphUri.value)))
    }
  })

  // Add rdf:type owl:Ontology
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.rdf.type.value), namedNode(vocab.owl.Ontology.value), namedNode(graphUri.value)))

  // Save quads to the store
  for (const q of quads.value) {
    await addQuad(q)
  }

  reloadTrigger.value++
  dialogRef?.value.close()
}

const cancelCreation = () => {
  dialogRef?.value.close()
}
</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <div class="font-medium mb-4">Create New Ontology</div>

    <div class="font-medium mb-2">VANN Predicates</div>
    <div
      v-for="(predicate, index) in vannPredicates"
      :key="index"
      class="flex items-center gap-2 w-full"
    >
      <Textarea
        v-model="predicate.value"
        :placeholder="predicate.predicate"
        autogrow
        showClear
        class="w-full"
      />
    </div>

    <div class="font-medium mb-2 mt-4">DC Predicates</div>
    <div
      v-for="(predicate, index) in dcPredicates"
      :key="index"
      class="flex items-center gap-2 w-full"
    >
      <Textarea
        v-model="predicate.value"
        :placeholder="predicate.predicate"
        autogrow
        showClear
        class="w-full"
      />
    </div>

    <div class="flex justify-end gap-2 mt-4">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        text
        @click="cancelCreation"
      />
      <Button
        type="button"
        label="Confirm"
        severity="secondary"
        outlined
        @click="confirmCreation"
      />
    </div>
  </div>
</template>