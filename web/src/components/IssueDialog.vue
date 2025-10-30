<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'

interface Props {
  issueNumber: number
}

const props = defineProps<Props>()

const { selectedOntology } = storeToRefs(useGraphStore())

const issue = ref<Awaited<ReturnType<typeof gitHubService.getIssue>>>()
const comments = ref<Awaited<ReturnType<typeof gitHubService.getIssueComments>>>([])

onMounted(async () => {
  if (
    !selectedOntology.value?.owner ||
    !selectedOntology.value.repo ||
    props.issueNumber === undefined
  ) {
    return
  }
  issue.value = await gitHubService.getIssue(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    props.issueNumber
  )
  comments.value = await gitHubService.getIssueComments(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    props.issueNumber
  )
})

const newComment = ref('')
const addComment = async () => {
  if (
    !selectedOntology.value?.owner ||
    !selectedOntology.value.repo ||
    props.issueNumber === undefined
  ) {
    return
  }
  await gitHubService.addIssueComment(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    props.issueNumber,
    newComment.value
  )
  newComment.value = ''
  comments.value = await gitHubService.getIssueComments(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    props.issueNumber
  )
}
</script>

<template>
  <DialogContent class="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>Issue #{{ issueNumber }}</DialogTitle>
      <DialogDescription v-if="issue">
        {{ issue.title }}
      </DialogDescription>
    </DialogHeader>
    <div class="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
      <div
        v-if="issue"
        class="text-sm"
      >
        <p class="whitespace-pre-wrap">{{ issue.body }}</p>
      </div>
      <Separator v-if="comments.length > 0" />
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="ml-4 text-sm"
      >
        <p class="whitespace-pre-wrap">{{ comment.body }}</p>
        <Separator class="mt-2" />
      </div>
      <div class="grid gap-2">
        <Textarea
          v-model="newComment"
          rows="3"
          placeholder="Add a comment"
        />
        <Button
          class="w-full"
          @click="addComment"
        >Add Comment</Button>
      </div>
    </div>
  </DialogContent>
</template>
