<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'
import { toast } from 'vue-sonner'

interface Props {
  parentUri: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { selectedOntology } = storeToRefs(useGraphStore())

const newIssueTitle = ref('')
const newIssueBody = ref('')

const createIssue = async () => {
  try {
    if (!selectedOntology.value?.owner || !selectedOntology.value.repo) {
      return
    }
    const title = `\`${props.parentUri}\` ${newIssueTitle.value}`
    const body = `**URI:** \`${props.parentUri}\`
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

    emit('confirm')
  } catch (error) {
    toast.error('Error creating issue', {
      description: error instanceof Error ? error.message : String(error)
    })
    console.error(error)
  }
}
</script>

<template>
  <DialogContent class="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Create New Issue</DialogTitle>
      <DialogDescription>
        Create a new GitHub issue for this resource.
      </DialogDescription>
    </DialogHeader>
    <div class="grid gap-4 py-4">
      <Input
        v-model="newIssueTitle"
        placeholder="Issue Title"
      />
      <Textarea
        v-model="newIssueBody"
        rows="3"
        placeholder="Issue Body"
      />
    </div>
    <DialogFooter>
      <Button
        type="button"
        variant="ghost"
        @click="emit('cancel')"
      >Cancel</Button>
      <Button
        type="button"
        variant="outline"
        @click="createIssue"
      >Confirm</Button>
    </DialogFooter>
  </DialogContent>
</template>
