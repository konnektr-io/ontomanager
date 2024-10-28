<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGraphStore } from '@/stores/graph'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'

const { userGraphs } = storeToRefs(useGraphStore())
const { addGraph } = useGraphStore()
const newOntologyUrl = ref('')

const predefinedOntologies = [
  { name: 'SML', description: 'Building information modelling (BIM) - Semantic modelling and linking (SML) - CEN-EN 17632', urls: ['https://docs.crow.nl/sml/data/concat/sml.ttl'] },
  { name: 'BOT', description: 'The Building Topology Ontology (BOT) is a minimal ontology for describing the core topological concepts of a building.', urls: ['http://www.w3id.org/bot/bot.ttl'] },
  { name: 'RealEstateCore + Brick', description: 'RealEstateCore is an ontology for building-related data and applications. Brick defines HVAC, lighting, spatial and electrical concepts and relationships.', urls: ['https://github.com/RealEstateCore/rec/blob/main/Source/SHACL/RealEstateCore/rec.ttl', 'https://github.com/RealEstateCore/rec/blob/main/Source/SHACL/Brick/Brick%2Bpatches.ttl'] },
  {
    name: 'DPROD + DCAT', description: 'The Data Product (DPROD) specification is a profile of the Data Catalog (DCAT) Vocabulary, designed to describe Data Products. ', urls: ['https://ekgf.github.io/dprod/dprod.ttl', 'https://ekgf.github.io/dprod/dprod-shapes.ttl', 'https://www.w3.org/ns/dcat3.ttl']
  }
]

const importOntology = (urls: string | string[]) => {
  addGraph(urls)
  newOntologyUrl.value = ''
}
</script>

<template>
  <div class="bg-surface-0 dark:bg-surface-950 px-6 py-12 md:px-12 lg:px-20">
    <div class="mb-4 font-bold text-xl mb-[3rem]">
      <span
        v-if="!userGraphs.length"
        class="text-surface-900 dark:text-surface-0"
      >Get Started</span>
      <span
        v-else
        class="text-surface-900 dark:text-surface-0"
      >Load ontologies</span>
    </div>
    <div class="text-surface-700 dark:text-surface-0/70 mb-2">Import an ontology</div>
    <div class="flex items-center gap-4 mb-4">
      <InputText
        v-model="newOntologyUrl"
        placeholder="Enter ontology URL"
        class="flex-auto"
      />
      <Button
        label="Import"
        outlined
        severity="secondary"
        @click="importOntology(newOntologyUrl)"
      />
    </div>
    <div class="text-surface-700 dark:text-surface-0/70 mb-[3rem]">Load ontologies in .ttl format from a URL or from
      your Github repository (eg. <span
        class="italic hover:text-surface-900 hover:underline cursor-pointer"
        @click="newOntologyUrl = 'https://github.com/konnektr-io/ontologies/blob/main/pizza.ttl'"
      >https://github.com/konnektr-io/ontologies/blob/main/pizza.ttl)</span></div>
    <div class="text-surface-700 dark:text-surface-0/70 mb-2">Or load and extend an existing ontology</div>
    <div class="flex flex-wrap gap-4">
      <Card
        v-for="ontology in predefinedOntologies"
        v-ripple
        :key="ontology.urls.join('_')"
        class="cursor-pointer w-[15rem]"
        @click="importOntology(ontology.urls)"
      >
        <template #title>{{ ontology.name }}</template>
        <template #content>{{ ontology.description }}</template>
      </Card>
    </div>
  </div>
</template>