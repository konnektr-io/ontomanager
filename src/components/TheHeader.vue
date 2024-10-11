<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import UserMenu from './UserMenu.vue'
import { useGraphStore } from '@/stores/graph-store'

const { userGraphs } = storeToRefs(useGraphStore())
const { toggleOntologyVisibility, addOntology } = useGraphStore()

interface OntologyItem {
  name: string
  visible: boolean
}

// Sample data (replace with actual data and logic)
const selectedOntology = ref(null)
const ontologies = computed(() => userGraphs.value.map(graph => ({
  name: graph.url,
  visible: graph.visible
})));

const editMode = ref(true)
const selectedBranch = ref(null)
const branches = ref([
  { name: 'main' },
  { name: 'develop' },
])
/* const pendingChanges = ref(0)

const searchQuery = ref('')

const userMenu = ref()
const userMenuItems = [
  { label: 'Profile', icon: 'pi pi-user' },
  { label: 'Settings', icon: 'pi pi-cog' },
  { label: 'Logout', icon: 'pi pi-power-off' },
]
 */
const toggleVisibility = (ontology: OntologyItem) => {
  toggleOntologyVisibility(ontology.name);
}

const openGitHub = (ontology: OntologyItem) => {
  // Implement GitHub link opening logic
}

const importDialogVisible = ref(false);
const newOntologyUrl = ref('');

const openImportDialog = () => {
  importDialogVisible.value = true;
}

const importOntology = () => {
  addOntology(newOntologyUrl.value);
  importDialogVisible.value = false;
  newOntologyUrl.value = '';
};
</script>

<template>
  <div class="flex items-center justify-between w-full">
    <!-- Title -->
    <div class="flex items-center gap-2 text-lg font-medium">
      <i class="pi pi-sitemap"></i>
      <span>OntoManager</span>
    </div>

    <!-- Right-aligned content -->
    <div
      class="flex items-center gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6"
    >
      <!-- Ontology Select -->
      <Select
        v-model="selectedOntology"
        :options="ontologies"
        optionLabel="name"
        placeholder="Select Ontology"
        class="w-128"
      >
        <template #value="slotProps">
          <div
            v-if="slotProps.value"
            class="flex items-center"
          >
            <div>{{ slotProps.value.name }}</div>
          </div>
          <span v-else>
            {{ slotProps.placeholder }}
          </span>
        </template>
        <template #option="slotProps">
          <div class="flex items-center justify-between w-full">
            <span>{{ slotProps.option.name }}</span>
            <div class="pl-3">
              <Button
                :icon="`pi pi-eye${slotProps.option.visible ? '' : '-slash'}`"
                size="info"
                text
                rounded
                @click.stop="toggleVisibility(slotProps.option)"
              />
              <Button
                icon="pi pi-github"
                size="small"
                text
                rounded
                @click.stop="openGitHub(slotProps.option)"
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

      <!-- Branch Selection (only in edit mode) -->
      <Select
        v-if="editMode"
        v-model="selectedBranch"
        :options="branches"
        optionLabel="name"
        placeholder="Select Branch"
        class="w-48"
      />

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