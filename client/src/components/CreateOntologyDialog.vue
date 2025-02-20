<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { DataFactory, type Quad } from 'n3'
import { storeToRefs } from 'pinia'
import { hexoid } from 'hexoid'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import { vocab } from '@/utils/vocab'
import gitHubService from '@/services/GitHubService'
import { useGitHubStore } from '@/stores/github'

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

const { userGraphs, selectedOntology } = storeToRefs(useGraphStore())
const { addQuad, saveUserGraphsToLocalStorage, writeGraph, clearUndoRedoStacks } = useGraphStore()
const reloadTrigger = ref(0)
const { name } = storeToRefs(useGitHubStore())

interface EditableObject {
  predicate: string;
  label: string;
  value: string;
}

const predicates = ref<EditableObject[]>([
  { predicate: vocab.vann.preferredNamespacePrefix.value, label: 'Prefix', value: 'ex' },
  { predicate: vocab.vann.preferredNamespaceUri.value, label: 'Namespace URI', value: 'https://ontologies.yourdomain.com/example#' },
  { predicate: vocab.dc.title.value, label: 'Title', value: 'Example' },
  { predicate: vocab.dc.description.value, label: 'Description', value: 'Example ontology description' },
  { predicate: vocab.dc.creator.value, label: 'Creator', value: name.value || '' }
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
      quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(predicate), literal(value, 'en'), graphNode))
    }
  })

  // Add rdf:type owl:Ontology
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.rdf.type.value), namedNode(vocab.owl.Ontology.value), graphNode))

  // Add dc:created
  quads.value.push(quad(namedNode(preferredNamespaceUri), namedNode(vocab.dc.created.value), literal(new Date().toISOString(), vocab.xsd.dateTime), graphNode))

  const scopeId = hexoid(11)()


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
      ...preferredNamespacePrefix && { [preferredNamespacePrefix]: graphNode },
      'rdf': namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
      'rdfs': namedNode('http://www.w3.org/2000/01/rdf-schema#'),
      'owl': namedNode('http://www.w3.org/2002/07/owl#'),
      'dc': namedNode('http://purl.org/dc/elements/1.1/'),
      'vann': namedNode('http://purl.org/vocab/vann/'),
      'xsd': namedNode('http://www.w3.org/2001/XMLSchema#'),
      'skos': namedNode('http://www.w3.org/2004/02/skos/core#')
    },
    scopeId
    // sha: ''
  }

  userGraphs.value.push(graphDetails)
  saveUserGraphsToLocalStorage()

  selectedOntology.value = graphDetails

  // Save quads to the store
  for (const q of quads.value) {
    await addQuad(q, scopeId)
  }
  const commitMessage = `Create new ontology ${preferredNamespaceUri}`
  const content = await writeGraph(selectedOntology.value)
  if (!content ||
    !selectedOntology.value.owner ||
    !selectedOntology.value.repo ||
    !selectedOntology.value.path ||
    !selectedOntology.value.branch ||
    !commitMessage
  ) return
  await gitHubService.commitFile(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    selectedOntology.value.path,
    content,
    commitMessage,
    selectedOntology.value.branch)
  clearUndoRedoStacks()

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
      <InputText
        v-if="predicate.predicate !== vocab.dc.description.value"
        id="value"
        v-model="predicate.value"
        showClear
        :autogrow="predicate.predicate === vocab.dc.description.value"
        class="w-3/4"
      />
      <Textarea
        v-else
        id="value"
        v-model="predicate.value"
        showClear
        autogrow
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