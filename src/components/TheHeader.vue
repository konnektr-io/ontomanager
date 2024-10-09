<script setup lang="ts">
import { ref } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import UserMenu from './UserMenu.vue'

interface OntologyItem {
  name: string
  visible: boolean
}

// Sample data (replace with actual data and logic)
const selectedOntology = ref(null)
const ontologies = ref<OntologyItem[]>([
  { name: 'Ontology 1', visible: true },
  { name: 'Ontology 2', visible: false },
])

const editMode = ref(true)
const selectedBranch = ref(null)
const branches = ref([
  { name: 'main' },
  { name: 'develop' },
])
const pendingChanges = ref(0)

const searchQuery = ref('')

const userMenu = ref()
const userMenuItems = [
  { label: 'Profile', icon: 'pi pi-user' },
  { label: 'Settings', icon: 'pi pi-cog' },
  { label: 'Logout', icon: 'pi pi-power-off' },
]

const toggleVisibility = (ontology: OntologyItem) => {
  ontology.visible = !ontology.visible
}

const openGitHub = (ontology: OntologyItem) => {
  // Implement GitHub link opening logic
}

const openImportDialog = () => {
  // Implement import dialog logic
}
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
          <div class="flex items-center justify-between">
            <span>{{ slotProps.option.name }}</span>
            <div class="pl-3">
              <Button
                size="small"
                icon="pi pi-eye"
                class="p-button-text p-button-sm"
                @click.stop="toggleVisibility(slotProps.option)"
              />
              <Button
                size="small"
                icon="pi pi-github"
                class="p-button-text p-button-sm"
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
  </div>
</template>