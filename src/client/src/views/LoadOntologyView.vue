<script setup lang="ts">
import { ref } from 'vue'
import { useGraphStore } from '@/stores/graph'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const { addGraph } = useGraphStore()
const newOntologyUrl = ref('')

const predefinedOntologies = [
  { name: 'SML', description: 'Building information modelling (BIM) - Semantic modelling and linking (SML) - CEN-EN 17632', urls: ['https://docs.crow.nl/sml/data/concat/sml.ttl'] },
  { name: 'BOT', description: 'Building Topology Ontology', urls: ['http://www.w3id.org/bot/bot.ttl'] },
  { name: 'RealEstateCore + Brick', urls: ['https://github.com/RealEstateCore/rec/blob/main/Source/SHACL/RealEstateCore/rec.ttl', 'https://github.com/RealEstateCore/rec/blob/main/Source/SHACL/Brick/Brick%2Bpatches.ttl'] }
]

const importOntology = (urls: string | string[]) => {
  addGraph(urls)
  newOntologyUrl.value = ''
}
</script>

<template>
  <div class="bg-surface-0 dark:bg-surface-950 px-6 py-12 md:px-12 lg:px-20">
    <div class="mb-4 font-bold text-xl">
      <span class="text-surface-900 dark:text-surface-0">Get Started</span>
    </div>
    <div class="text-surface-700 dark:text-surface-0/70 mb-[3rem]">Import an ontology</div>
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
    <div class="text-surface-700 dark:text-surface-0/70 mb-[3rem]">Or load a common ontology</div>
    <div class="flex flex-wrap gap-4">
      <Button
        v-for="ontology in predefinedOntologies"
        :key="ontology.name"
        :label="ontology.name"
        outlined
        severity="secondary"
        @click="importOntology(ontology.urls)"
      />
    </div>
  </div>
</template>