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

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')


const { addQuad } = useGraphStore()
const reloadTrigger = ref(0)

interface EditableObject {
  predicate: string;
  label: string;
  value: string;
}

const predicates = ref<EditableObject[]>([
  { predicate: vocab.vann.preferredNamespacePrefix.value, label: 'Prefix', value: '' },
  { predicate: vocab.vann.preferredNamespaceUri.value, label: 'Namespace URI', value: '' },
  { predicate: vocab.dc.title.value, label: 'Title', value: '' },
  { predicate: vocab.dc.description.value, label: 'Label', value: '' },
  { predicate: vocab.dc.creator.value, label: 'Creator', value: '' }
])

const quads = ref<Quad[]>([])

const confirmCreation = async () => {
  const preferredNamespaceUri = predicates.value.find(p => p.predicate === vocab.vann.preferredNamespaceUri.value)?.value
  if (!preferredNamespaceUri) return

  // Add predicates
  predicates.value.forEach(({ predicate, value }) => {
    if (value) {
      quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(predicate), literal(value), namedNode(preferredNamespaceUri)))
    }
  })

  // Add rdf:type owl:Ontology
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.rdf.type.value), namedNode(vocab.owl.Ontology.value), namedNode(preferredNamespaceUri)))

  // Add dc:created
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.dc.created.value), literal(new Date().toISOString()), namedNode(preferredNamespaceUri)))

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

    <div
      v-for="(predicate, index) in predicates"
      :key="index"
      class="flex items-center gap-2 w-full"
    >
      <label
        for="value"
        class="w-1/4"
      >{{ predicate.label }}</label>
      <Textarea
        id="value"
        v-model="predicate.value"
        :placeholder="predicate.predicate"
        autogrow
        showClear
        class="w-3/4"
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