<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { DataFactory, type Quad } from 'n3'
import { storeToRefs } from 'pinia'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { vocab } from '@/utils/vocab'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'

const { namedNode, literal, quad } = DataFactory

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    repository: string;
    filePath: string;
    branch: string;
  }
}>>('dialogRef')

const repository = computed(() => dialogRef?.value.data.repository)
const filePath = computed(() => dialogRef?.value.data.filePath)
const branch = computed(() => dialogRef?.value.data.branch)

const { userGraphs } = storeToRefs(useGraphStore())
const { addQuad, saveUserGraphsToLocalStorage } = useGraphStore()
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
  { predicate: vocab.dc.description.value, label: 'Description', value: '' },
  { predicate: vocab.dc.creator.value, label: 'Creator', value: '' }
])

const quads = ref<Quad[]>([])

const confirmCreation = async () => {
  if (!repository.value || !filePath.value || !branch.value) return

  const preferredNamespaceUri = predicates.value.find(p => p.predicate === vocab.vann.preferredNamespaceUri.value)?.value
  if (!preferredNamespaceUri) return

  const preferredNamespacePrefix = predicates.value.find(p => p.predicate === vocab.vann.preferredNamespacePrefix.value)?.value

  const graphNode = namedNode(preferredNamespaceUri)

  // Add predicates
  predicates.value.forEach(({ predicate, value }) => {
    if (value) {
      quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(predicate), literal(value), graphNode))
    }
  })

  // Add rdf:type owl:Ontology
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.rdf.type.value), namedNode(vocab.owl.Ontology.value), graphNode))

  // Add dc:created
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.dc.created.value), literal(new Date().toISOString()), graphNode))

  // Save quads to the store
  for (const q of quads.value) {
    await addQuad(q)
  }

  // TODO: Now prepare and load UserGraphs and commit to github
  const graphDetails: GraphDetails = {
    url: `https://github.com/${repository.value}/blob/${branch.value}/${filePath.value}`,
    owner: repository.value.split('/')[0],
    repo: repository.value.split('/')[1],
    branch: branch.value,
    path: filePath.value,
    visible: true,
    loaded: true,
    namespace: preferredNamespaceUri,
    node: graphNode,
    prefixes: {
      ...preferredNamespacePrefix && { [preferredNamespacePrefix]: namedNode(preferredNamespaceUri) },
      'rdf': namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
      'rdfs': namedNode('http://www.w3.org/2000/01/rdf-schema#'),
      'owl': namedNode('http://www.w3.org/2002/07/owl#'),
      'dc': namedNode('http://purl.org/dc/elements/1.1/'),
      'vann': namedNode('http://purl.org/vocab/vann/'),
      'xsd': namedNode('http://www.w3.org/2001/XMLSchema#'),
      'skos': namedNode('http://www.w3.org/2004/02/skos/core#')
    }
    // sha: ''
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
        v-tooltip="predicate.predicate"
      >{{ predicate.label }}</label>
      <Textarea
        id="value"
        v-model="predicate.value"
        showClear
        :autogrow="predicate.predicate === vocab.dc.description.value"
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