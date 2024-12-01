<script setup lang="ts">
import { computed, ref, inject, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useToast } from 'primevue/usetoast'
import { useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'

const toast = useToast()
const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    parentUri: string;
  }
}>>('dialogRef')
const parentUri = computed<string>(() => dialogRef?.value.data.parentUri)

const { selectedOntology } = storeToRefs(useGraphStore())

const newIssueTitle = ref('')
const newIssueBody = ref('')

const createIssue = async () => {
  try {
    if (!selectedOntology.value?.owner || !selectedOntology.value.repo) {
      return
    }
    const title = `\`${parentUri.value}\` ${newIssueTitle.value}`
    const body = `**URI:** \`${parentUri.value}\`
**Branch:** \`${selectedOntology.value.branch}\`
**File:** \`${selectedOntology.value.path}\`

### Comment

${newIssueBody.value}`
    await gitHubService.createIssue(
      selectedOntology.value.owner,
      selectedOntology.value.repo,
      title,
      body,
      []
    )

    dialogRef?.value.close()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error, life: 3000 })
    console.error(error)
  }
}

</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <InputText
      v-model="newIssueTitle"
      placeholder="Issue Title"
    />
    <Textarea
      v-model="newIssueBody"
      rows="3"
      cols="30"
      placeholder="Issue Body"
    ></Textarea>
    <div class="flex justify-end gap-2 mt-4">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        text
        @click="dialogRef?.close()"
      />
      <Button
        type="button"
        label="Confirm"
        severity="secondary"
        outlined
        @click="createIssue"
      />
    </div>
  </div>
</template>