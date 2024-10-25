<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import ProgressSpinner from 'primevue/progressspinner'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import gitHubService from '@/services/GitHubService'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import UserMenu from './UserMenu.vue'

const confirm = useConfirm()
const { userGraphs, selectedOntology, undoStackSize } = storeToRefs(useGraphStore())
const {
  toggleGraphVisibility,
  addGraph,
  removeGraph,
  writeGraph,
  loadGraph,
  clearUndoRedoStacks
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

const importOntology = () => {
  addGraph(newOntologyUrl.value)
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

const changeSelectedOntology = async (graph: GraphDetails | null) => {
  // If the undo stack is not empty, ask for confirmation
  if (undoStackSize.value) {
    confirm.require({
      header: 'Change Ontology',
      message: 'Changing ontologies will remove all unsaved changes. Do you want to proceed?',
      icon: 'pi pi-exclamation-triangle',
      modal: false,
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
        text: true
      },
      acceptProps: {
        label: 'Change Branch',
        severity: 'secondary',
        outlined: true
      },
      accept: () => {
        clearUndoRedoStacks()
        selectedOntology.value = graph
      },
      reject: () => {
      }
    })
  } else {
    selectedOntology.value = graph
  }
}

const changeBranch = async (graph: GraphDetails, branch: string) => {
  if (!graph.branch || !branch) return

  // If the undo stack is not empty, ask for confirmation
  if (undoStackSize.value) {
    confirm.require({
      header: 'Change Branch',
      message: 'Changing branches will remove all unsaved changes. Do you want to proceed?',
      icon: 'pi pi-exclamation-triangle',
      modal: false,
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
        text: true
      },
      acceptProps: {
        label: 'Change Branch',
        severity: 'secondary',
        outlined: true
      },
      accept: () => {
        if (graph.branch && branch && graph.node) {
          clearUndoRedoStacks()
          const newUrl = graph.url.replace(graph.branch, branch)
          removeGraph(graph)
          addGraph(newUrl)
          graph.branch = branch
        }
      },
      reject: () => {
      }
    })
  } else {
    if (graph.branch && branch && graph.node) {
      const newUrl = graph.url.replace(graph.branch, branch)
      removeGraph(graph)
      addGraph(newUrl)
      graph.branch = branch
    }
  }
}

const commitDialogVisible = ref(false)
const commitMessage = ref('')
const cancelChanges = () => {
  // reload the graph

  if (selectedOntology.value) {
    loadGraph(selectedOntology.value)
  }
  commitDialogVisible.value = false
  commitMessage.value = ''
}
const commitChanges = async () => {
  // Implement commit changes logic
  // For now just export and download the file
  if (selectedOntology.value) {
    const content = await writeGraph(selectedOntology.value)
    if (!content ||
      !selectedOntology.value.owner ||
      !selectedOntology.value.repo ||
      !selectedOntology.value.path ||
      !selectedOntology.value.branch ||
      !commitMessage.value
    ) return
    await gitHubService.commitFile(
      selectedOntology.value.owner,
      selectedOntology.value.repo,
      selectedOntology.value.path,
      content,
      commitMessage.value,
      selectedOntology.value.branch)
    clearUndoRedoStacks()
    commitDialogVisible.value = false
    commitMessage.value = ''
  }
}

</script>

<template>
  <div class="flex items-center justify-between w-full">
    <!-- Title -->
    <div class="flex items-center gap-2 text-lg font-medium text-surface-900">
      <i class="pi pi-sitemap"></i>
      <span>OntoManager</span>
    </div>

    <!-- Ontology Select -->
    <div class="flex items-center gap-6 md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-240">
      <Select
        :model-value="selectedOntology"
        :options="userGraphs"
        v-ripple="false"
        optionLabel="name"
        showClear
        placeholder="Select Ontology"
        class="w-[32rem] text-sm"
        :pt:clearIcon:onClick="() => changeSelectedOntology(null)"
        @change="changeSelectedOntology($event.value)"
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
          <div class="flex items-center justify-between w-full text-sm gap-4">
            <div>
              <ProgressSpinner
                v-if="slotProps.option.loaded !== true"
                style="width: 1.5rem; height: 1.5rem"
              ></ProgressSpinner><span>{{ slotProps.option.name || slotProps.option.url || slotProps.option }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Button
                :icon="`pi pi-${slotProps.option.error ? 'info-circle text-red-500' : slotProps.option.repo ? 'github' : 'link'}`"
                size="small"
                text
                rounded
                @click.stop="openUrl(slotProps.option.url)"
              />
              <Button
                :icon="`pi pi-eye${slotProps.option.visible ? '' : '-slash'}`"
                size="small"
                text
                rounded
                @click.stop="toggleGraphVisibility(slotProps.option)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                text
                rounded
                @click.stop="removeGraph(slotProps.option)"
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
      <i
        v-if="userGraphs.some(g => g.error)"
        v-tooltip="userGraphs.filter(g => g.error).map(g => g.error).join('\n')"
        class="pi pi-info-circle text-red-500"
      >
      </i>
      <Select
        v-if="selectedOntology && selectedOntology.branch"
        :model-value="selectedOntology.branch"
        :options="selectedOntology.branches ?? []"
        placeholder="Select Branch"
        class="w-36"
        pt:option:class="text-sm"
        @focus="fetchBranches(selectedOntology)"
        @change="changeBranch(selectedOntology, $event.value)"
      >
        <template #footer>
          <div class="p-3">
            <Button
              label="New Branch"
              fluid
              severity="secondary"
              text
              size="small"
              icon="pi pi-plus"
            />
          </div>
        </template></Select>
      <Button
        v-if="selectedOntology && selectedOntology.branch && undoStackSize"
        label="Commit"
        outlined
        :badge="`${undoStackSize}`"
        @click="commitDialogVisible = true"
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
      <span class="text-surface-500 dark:text-surface-400 block mb-8">Enter an url to the ontology to load. Github URLs
        require to be signed in.</span>
      <div class="flex items-center gap-4 mb-4">
        <label
          for="ontologyUrl"
          class="font-semibold w-16"
        >URL</label>
        <InputText
          id="ontologyUrl"
          v-model="newOntologyUrl"
          class="flex-auto"
        />
      </div>
      <template #footer>
        <!-- <Button
          label="Cancel"
          text
          severity="secondary"
          @click="importDialogVisible = false"
          autofocus
        /> -->
        <Button
          label="Import"
          outlined
          severity="secondary"
          @click="importOntology"
          autofocus
        />
      </template>
    </Dialog>

    <!-- Commit dialog -->
    <Dialog
      header="Commit Changes"
      v-model:visible="commitDialogVisible"
      modal
    >
      <span class="text-surface-500 dark:text-surface-400 block mb-8">Commit changes to the selected ontology.</span>
      <div class="flex flex-col gap-2 mb-4">
        <div
          id="fileDetails"
          class="text-surface-500 dark:text-surface-400"
        >
          <p><span class="font-semibold">File:</span> {{ selectedOntology?.url }}</p>
          <p><span class="font-semibold">Repository:</span> {{ selectedOntology?.repo }}</p>
          <p>
            <span class="font-semibold">Branch:</span> {{ selectedOntology?.branch }}
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-2 mb-4">
        <label
          for="commitMessage"
          class="font-semibold"
        >Message</label>
        <Textarea
          id="commitMessage"
          v-model="commitMessage"
          autoResize
          rows="5"
          cols="30"
        />
      </div>

      <template #footer>
        <Button
          label="Cancel"
          text
          severity="secondary"
          @click="cancelChanges"
          autofocus
        />
        <Button
          label="Commit"
          outlined
          severity="secondary"
          autofocus
          :disabled="!commitMessage || !commitMessage.length"
          @click="commitChanges"
        />
      </template>
    </Dialog>

  </div>
</template>