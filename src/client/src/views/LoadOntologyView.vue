<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useDialog } from 'primevue/usedialog'
import { useGitHubStore } from '@/stores/github'
import { useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'
import CreateOntologyDialog from '@/components/CreateOntologyDialog.vue'

const { isSignedIn, username } = storeToRefs(useGitHubStore())
const { loginToGitHub } = useGitHubStore()
const { userGraphs } = storeToRefs(useGraphStore())
const { addGraph } = useGraphStore()
const newOntologyUrl = ref('')

const predefinedOntologies = [{
  name: 'SML',
  description: 'Building information modelling (BIM) - Semantic modelling and linking (SML) - CEN-EN 17632',
  urls: ['https://docs.crow.nl/sml/data/concat/sml.ttl'],
  visible: true
}, {
  name: 'BOT',
  description: 'The Building Topology Ontology (BOT) is a minimal ontology for describing the core topological concepts of a building.',
  urls: ['http://www.w3id.org/bot/bot.ttl'],
  visible: true
}, {
  name: 'Brick',
  description: 'Brick is an open-source effort to standardize semantic descriptions of the physical, logical and virtual assets in buildings and the relationships between them.',
  urls: ['https://brickschema.org/schema/1.4.2/Brick.ttl'],
  visible: true
}, {
  name: 'RealEstateCore',
  description: 'RealEstateCore (REC)is an ontology for building-related data and applications.',
  urls: ['https://github.com/RealEstateCore/rec/blob/main/Source/SHACL/RealEstateCore/rec.ttl'],
  visible: () => isSignedIn.value
}, {
  name: 'ASHRAE Standard 223',
  description: 'Interoperable semantic framework for representing building automation and control data, and other building system information.',
  urls: ['https://open223.info/223p.ttl'],
  visible: true
}, {
  name: 'DPROD + DCAT',
  description: 'The Data Product (DPROD) specification is a profile of the Data Catalog (DCAT) Vocabulary, designed to describe Data Products. ',
  urls: ['https://ekgf.github.io/dprod/dprod.ttl', 'https://ekgf.github.io/dprod/dprod-shapes.ttl', 'https://www.w3.org/ns/dcat3.ttl'],
  visible: true
}, {
  name: 'International Data Spaces (IDS)',
  description: 'The International Data Spaces (IDS) is a peer-to-peer network, a virtual data space that supports the secure exchange and the simple linking of data in business eco-systems on the basis of standards.',
  urls: ['https://international-data-spaces-association.github.io/InformationModel/docs/serializations/ontology.ttl'],
  visible: true
}
]

const importOntology = (urls: string | string[]) => {
  addGraph(urls)
  newOntologyUrl.value = ''
}

const repositories = ref<Awaited<ReturnType<typeof gitHubService.getRepositories>>>([])
watch(isSignedIn, async () => {
  if (isSignedIn.value && username.value) {
    repositories.value = (await gitHubService.getRepositories(username.value)).filter(repo => repo.permissions?.push)
  }
}, { immediate: true })
const createNewOntologySelectedRepository = ref<string>()
const branches = ref<string[]>([])
watch(createNewOntologySelectedRepository, async () => {
  if (createNewOntologySelectedRepository.value) {
    const repo = repositories.value.find(repo => repo.full_name === createNewOntologySelectedRepository.value)
    if (!repo) return
    const [owner, repoName] = repo.full_name.split('/')
    branches.value = (await gitHubService.getBranches(owner, repoName)).map(branch => branch.name)
  }
}, { immediate: true })
const createNewOntologyFilePath = ref<string>()
const createNewOntologyBranch = ref<string>('main')

const dialog = useDialog()
const openNewOntologyDialog = () => {
  dialog.open(CreateOntologyDialog, {
    props: {
      header: 'New Ontology',
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
      repository: createNewOntologySelectedRepository.value,
      filePath: createNewOntologyFilePath.value,
      branch: createNewOntologyBranch.value
    }
  }).close(() => {
  })
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
      >Create or import ontologies</span>
    </div>
    <div
      v-if="!isSignedIn"
      class="text-lg font-bold text-surface-700 dark:text-surface-0/70 mb-2"
    >Sign in to GitHub</div>
    <Button
      v-if="!isSignedIn"
      label="Sign in"
      icon="pi pi-github"
      iconPos="left"
      class="mb-[3rem]"
      outlined
      @click="loginToGitHub()"
    />

    <div
      v-if="isSignedIn"
      class="text-lg font-bold text-surface-700 dark:text-surface-0/70 mb-2"
    >Create a new ontology</div>
    <div
      v-if="isSignedIn"
      class="flex items-center gap-4 mb-4"
    >
      <Select
        v-model="createNewOntologySelectedRepository"
        :options="repositories"
        option-label="full_name"
        option-value="full_name"
        filter
        placeholder="Choose repository"
        class="flex-auto"
      />
      <Select
        v-model="createNewOntologyBranch"
        :options="branches"
        filter
        placeholder="Choose branch"
        class="flex-auto"
      />
      <InputText
        v-model="createNewOntologyFilePath"
        placeholder="new-ontology.ttl"
        class="flex-auto"
      />
      <Button
        label="Create"
        outlined
        severity="secondary"
        @click="openNewOntologyDialog"
      />
    </div>
    <div
      v-if="isSignedIn"
      class="text-surface-700 dark:text-surface-0/70 mb-[3rem]"
    >Select the repository and file path to create a new ontology.</div>

    <div class="text-lg font-bold text-surface-700 dark:text-surface-0/70 mb-2">Import an ontology</div>
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
      >https://github.com/konnektr-io/ontologies/blob/main/pizza.ttl</span>). <span
        class="hover:text-surface-900 hover:underline cursor-pointer"
        @click="loginToGitHub"
      >Sign in</span> to load (and edit) ontologies
      hosted on GitHub.</div>
    <div class="text-surface-700 dark:text-surface-0/70 mb-2">Or import one of these ontologies:</div>
    <div class="flex flex-wrap gap-4">
      <Card
        v-for="ontology in predefinedOntologies.filter(ontology => typeof ontology.visible === 'function' ? ontology.visible() : ontology.visible)"
        :key="ontology.urls.join('_')"
        v-ripple
        class="cursor-pointer w-[15rem]"
        @click="importOntology(ontology.urls)"
      >
        <template #title>{{ ontology.name }}</template>
        <template #content>{{ ontology.description }}</template>
      </Card>
    </div>
  </div>
</template>