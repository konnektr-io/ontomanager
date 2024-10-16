<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import UserMenu from './UserMenu.vue'
import { useGraphStore, type GraphDetails } from '@/stores/graph-store'
import gitHubService from '@/services/GitHubService'

const { userGraphs, selectedOntology, editMode } = storeToRefs(useGraphStore())
const {
  toggleOntologyVisibility,
  addOntology,
  removeOntology,
  writeGraph
} = useGraphStore()

const openUrl = (url: string) => {
  // Implement GitHub link opening logic
  if (url) {
    window.open(url, '_blank')
  }
}

const importDialogVisible = ref(false)
const newOntologyUrl = ref('')

const openImportDialog = () => {
  importDialogVisible.value = true
}

const importOntology = async () => {
  await addOntology(newOntologyUrl.value)
  importDialogVisible.value = false
  newOntologyUrl.value = ''
}

const fetchBranches = async (graph: GraphDetails) => {
  if (graph.owner && graph.repo && !graph.branches?.length) {
    graph.branches = (await gitHubService.getBranches(graph.owner, graph.repo)).map(b => b.name)
  }
}

watch(selectedOntology, async (graph) => {
  if (graph && graph.owner && graph.repo && !graph.branches?.length) {
    await fetchBranches(graph)
  }
})

const changeBranch = async (graph: GraphDetails, branch: string) => {
  if (!graph.branch || !branch) return
  const newUrl = graph.url.replace(graph.branch, branch)
  removeOntology(graph.url)
  addOntology(newUrl)
}

const commitChanges = async () => {
  // Implement commit changes logic
  // For now just export and download the file
  if (selectedOntology.value) writeGraph(selectedOntology.value.url)
}

</script>

<template>
  <div class="flex items-center justify-between w-full">
    <!-- Title -->
    <div class="flex items-center gap-2 text-lg font-medium">
      <i class="pi pi-sitemap"></i>
      <span>OntoManager</span>
    </div>

    <!-- Ontology Select -->
    <div class="flex items-center gap-6 md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-240">
      <Select
        v-model="selectedOntology"
        :options="userGraphs"
        optionLabel="name"
        placeholder="Select Ontology"
        class="w-96 text-sm"
      >
        <template #value="slotProps">
          <div
            v-if="slotProps.value"
            class="flex items-center"
          >
            <div>{{ slotProps.value.url }}</div>
          </div>
          <span v-else>
            {{ slotProps.placeholder }}
          </span>
        </template>
        <template #option="slotProps">
          <div class="flex items-center justify-between w-full text-sm">
            <span>{{ slotProps.option.name || slotProps.option.url || slotProps.option }}</span>
            <div class="pl-3">
              <Button
                v-if="slotProps.option.url"
                :icon="`pi pi-${slotProps.option.repo ? 'github' : 'link'}`"
                size="small"
                text
                rounded
                class="h-4"
                @click.stop="openUrl(slotProps.option.url)"
              />
              <Button
                :icon="`pi pi-eye${slotProps.option.visible ? '' : '-slash'}`"
                size="info"
                text
                rounded
                class="h-4"
                @click.stop="toggleOntologyVisibility(slotProps.option.url)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                rounded
                class="h-4"
                @click.stop="removeOntology(slotProps.option.url)"
              />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="p-3">
            <Button
              label="Import Ontology"
              fluid
              severity="secondary"
              text
              size="small"
              icon="pi pi-plus"
              @click="openImportDialog"
            />
          </div>
        </template>
      </Select>
      <Select
        v-if="selectedOntology && selectedOntology.branch"
        v-model="selectedOntology.branch"
        :options="selectedOntology.branches ?? []"
        placeholder="Select Branch"
        class="w-36"
        pt:option:class="text-sm"
        @focus="fetchBranches(selectedOntology)"
        @change="changeBranch(selectedOntology, $event.value)"
      />
      <Button
        v-if="selectedOntology && selectedOntology.branch"
        label="Commit"
        @click="commitChanges"
      ></Button>
    </div>
    <!-- Right-aligned content -->
    <div
      class="flex items-center gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6"
    >


      <!-- Search Box -->
      <!-- <span class="p-input-icon-left">
        <InputText
          v-model="searchQuery"
          placeholder="Search"
        />
      </span> -->

      <!-- User Menu -->
      <UserMenu />
    </div>


    <!-- Import Ontology Dialog -->
    <Dialog
      header="Import Ontology"
      v-model:visible="importDialogVisible"
      modal
    >
      <div class="p-fluid">
        <div class="field">
          <label for="ontologyUrl">Ontology URL</label>
          <InputText
            id="ontologyUrl"
            v-model="newOntologyUrl"
          />
        </div>
        <div class="field">
          <Button
            label="Import"
            icon="pi pi-check"
            @click="importOntology"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>