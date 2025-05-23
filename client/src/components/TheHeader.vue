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
import { useToast } from 'primevue/usetoast'
import gitHubService from '@/services/GitHubService'
import { useGraphStore, type GraphDetails } from '@/stores/graph'
import UserMenu from './UserMenu.vue'
import AIService from '@/services/AIService'
import { NamedNode } from 'n3'
import { labelNodes, classObjectNodes, propertyObjectNodes } from '@/services/GraphStoreService'

const toast = useToast()
const confirm = useConfirm()
const {
  selectedResource,
  userGraphs,
  graphsLoading,
  selectedOntology,
  undoStackSize
} = storeToRefs(useGraphStore())
const {
  toggleGraphVisibility,
  addGraph,
  removeGraph,
  writeGraph,
  loadGraph,
  clearUndoRedoStacks,
  serializeUndoStack,
  saveUserGraphsToLocalStorage
} = useGraphStore()

const ontologySelectRef = ref<InstanceType<typeof Select>>()

const openUrl = (url: string) => {
  // Implement GitHub link opening logic
  if (url) {
    window.open(url, '_blank')
  }
}

const showLoadOntologyPage = () => {
  selectedResource.value = null;
  (ontologySelectRef.value as unknown as { hide: () => void }).hide()
}

watch(selectedOntology, async (graph) => {
  if (graph && graph.owner && graph.repo) {
    await fetchBranches(graph)
  }
})

watch(userGraphs, graphs => {
  if (!graphs.length) {
    selectedResource.value = null
  }
}, { immediate: true, deep: true })

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

const fetchBranches = async (graph: GraphDetails) => {
  if (graph.owner && graph.repo) {
    graph.branches = await gitHubService.getBranches(graph.owner, graph.repo)
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
const newBranchDialogVisible = ref(false)
const newBranchName = ref('')
const createNewBranch = async () => {
  try {
    const currentBranch = selectedOntology.value?.branches?.find(b => b.name === selectedOntology.value?.branch)
    if (selectedOntology.value &&
      newBranchName.value &&
      selectedOntology.value.owner &&
      selectedOntology.value.repo &&
      currentBranch?.commit?.sha &&
      selectedOntology.value.branch) {
      await gitHubService.createNewBranch(
        selectedOntology.value.owner,
        selectedOntology.value.repo,
        currentBranch.commit.sha,
        newBranchName.value)
      selectedOntology.value.branches = await gitHubService.getBranches(selectedOntology.value.owner, selectedOntology.value.repo)
      changeBranch(selectedOntology.value, newBranchName.value)
      newBranchDialogVisible.value = false
      newBranchName.value = ''
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error, life: 3000 })
    console.error(error)
  }
}

const commitDialogVisible = ref(false)
const commitMessage = ref('')
const openCommitDialog = async () => {
  commitDialogVisible.value = true
  const changes = serializeUndoStack()
  commitMessage.value = selectedOntology.value?.path?.split('/').pop()?.replace('.ttl', '') + ' - '
  commitMessage.value += await AIService.suggestCommitMessage(changes)
}
const discardChanges = () => {
  // reload the graph

  if (selectedOntology.value) {
    loadGraph(selectedOntology.value)
  }

  clearUndoRedoStacks()

  commitDialogVisible.value = false
  commitMessage.value = ''
}
const commitLoading = ref(false)
const commitChanges = async () => {
  commitLoading.value = true
  try {
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
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error, life: 3000 })
    console.error(error)
  } finally {
    commitLoading.value = false
  }
}

const defaultsDialogVisible = ref(false)
const defaultsEditGraph = ref<GraphDetails | null>(null)
const defaultsDraft = ref({ label: '', class: '', property: '' })

// Helper to only allow exact allowed NamedNode types (preserves literal type)
function toGraphAllowedNamedNode<T extends NamedNode> (value: string | NamedNode | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined
  if (typeof value === 'object' && value.termType === 'NamedNode') {
    return allowed.find(n => n.value === value.value)
  }
  if (typeof value === 'string') {
    // Try to match by value
    return allowed.find(n => n.value === value)
  }
  return undefined
}

const openGraphDefaultsDialog = (graph: GraphDetails) => {
  defaultsEditGraph.value = graph
  defaultsDraft.value = {
    label: typeof graph.defaults?.label === 'object' ? graph.defaults.label.value : graph.defaults?.label || '',
    class: typeof graph.defaults?.class === 'object' ? graph.defaults.class.value : graph.defaults?.class || '',
    property: typeof graph.defaults?.property === 'object' ? graph.defaults.property.value : graph.defaults?.property || ''
  }
  defaultsDialogVisible.value = true
}

const saveGraphDefaults = () => {
  if (defaultsEditGraph.value) {
    const label = toGraphAllowedNamedNode(defaultsDraft.value.label, labelNodes)
    const classNode = toGraphAllowedNamedNode(defaultsDraft.value.class, classObjectNodes)
    const property = toGraphAllowedNamedNode(defaultsDraft.value.property, propertyObjectNodes)
    defaultsEditGraph.value.defaults = {
      ...(label ? { label } : {}),
      ...(classNode ? { class: classNode } : {}),
      ...(property ? { property } : {})
    }
    saveUserGraphsToLocalStorage()
  }
  defaultsDialogVisible.value = false
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
      <ProgressSpinner
        v-if="Object.values(graphsLoading).some(l => l)"
        style="width: 1.5rem; height: 1.5rem"
      ></ProgressSpinner>
      <Select
        v-if="userGraphs.length"
        ref="ontologySelectRef"
        :model-value="selectedOntology"
        :options="userGraphs"
        v-ripple="false"
        optionLabel="name"
        showClear
        placeholder="Select Ontology to Edit"
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
            <div class="flex items-center gap-2">
              <ProgressSpinner
                v-if="graphsLoading[slotProps.option.url]"
                style="width: 1.5rem; height: 1.5rem"
              ></ProgressSpinner>
              <span>{{ slotProps.option.name || slotProps.option.url || slotProps.option }}</span>
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
                icon="pi pi-cog"
                size="small"
                text
                rounded
                @click.stop="openGraphDefaultsDialog(slotProps.option)"
                v-tooltip="'Set defaults (label, class, property)'"
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
              label="Create or Import Ontology"
              fluid
              severity="secondary"
              text
              size="small"
              icon="pi pi-plus"
              @click="showLoadOntologyPage"
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
      <!-- Branch Select -->
      <Select
        v-if="userGraphs.length && selectedOntology && selectedOntology.branch"
        :model-value="selectedOntology.branch"
        :options="selectedOntology.branches ?? []"
        option-label="name"
        option-value="name"
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
              @click="newBranchDialogVisible = true"
            />
          </div>
        </template>
      </Select>
      <Button
        v-if="selectedOntology && selectedOntology.branch"
        label="Commit"
        outlined
        :badge="undoStackSize ? `${undoStackSize}` : undefined"
        @click="openCommitDialog"
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
    <!-- <Dialog
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
        <Button
          label="Import"
          outlined
          severity="secondary"
          @click="importOntology"
          autofocus
        />
      </template>
    </Dialog> -->

    <!-- New Branch Dialog -->
    <Dialog
      header="New Branch"
      v-model:visible="newBranchDialogVisible"
      modal
    >
      <span class="text-surface-500 dark:text-surface-400 block mb-8">Create new branch based.</span>
      <div class="flex flex-col gap-2 mb-4">
        <div
          id="fileDetails"
          class="text-surface-500 dark:text-surface-400"
        >
          <p><span class="font-semibold">Source:</span> {{ selectedOntology?.branch }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 mb-4">
        <label
          for="branchName"
          class="font-semibold"
        >Branch Name</label>
        <InputText
          id="branchName"
          v-model="newBranchName"
          class="flex-auto"
        />
      </div>
      <template #footer>
        <Button
          label="Create"
          outlined
          severity="secondary"
          @click="createNewBranch"
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
          label="Discard"
          text
          severity="secondary"
          @click="discardChanges"
          autofocus
        />
        <Button
          label="Commit"
          outlined
          severity="secondary"
          autofocus
          :loading="commitLoading"
          :disabled="!commitMessage || !commitMessage.length"
          @click="commitChanges"
        />
      </template>
    </Dialog>

    <!-- Defaults dialog -->
    <Dialog
      header="Set Graph Defaults"
      v-model:visible="defaultsDialogVisible"
      modal
    >
      <span class="text-surface-500 dark:text-surface-400 block mb-8">Set default label, class, and property annotations
        for this graph.</span>
      <div class="flex flex-col gap-2 mb-4">
        <label class="font-semibold">Label annotation</label>
        <Select
          v-model="defaultsDraft.label"
          :options="labelNodes"
          option-label="value"
          option-value="value"
          placeholder="Select label annotation"
          class="w-full"
        />
        <label class="font-semibold">Class annotation</label>
        <Select
          v-model="defaultsDraft.class"
          :options="classObjectNodes"
          option-label="value"
          option-value="value"
          placeholder="Select class annotation"
          class="w-full"
        />
        <label class="font-semibold">Property annotation</label>
        <Select
          v-model="defaultsDraft.property"
          :options="propertyObjectNodes"
          option-label="value"
          option-value="value"
          placeholder="Select property annotation"
          class="w-full"
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          text
          @click="defaultsDialogVisible = false"
        />
        <Button
          label="Save"
          outlined
          severity="secondary"
          @click="saveGraphDefaults"
          autofocus
        />
      </template>
    </Dialog>

  </div>
</template>