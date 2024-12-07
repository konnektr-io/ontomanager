<script setup lang="ts">
import { computed, onMounted, ref, inject, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import Button from 'primevue/button'
import Textarea from 'primevue/textarea'
import { TreeType, useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    issueNumber: number;
  }
}>>('dialogRef')
const issueNumber = computed<number>(() => dialogRef?.value.data.issueNumber)

const { selectedOntology } = storeToRefs(useGraphStore())


const issue = ref<Awaited<ReturnType<typeof gitHubService.getIssue>>>()
const comments = ref<Awaited<ReturnType<typeof gitHubService.getIssueComments>>>([])

onMounted(async () => {
  if (!selectedOntology.value?.owner || !selectedOntology.value.repo || issueNumber.value === undefined) {
    return
  }
  issue.value = await gitHubService.getIssue(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    issueNumber.value)
  comments.value = await gitHubService.getIssueComments(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    issueNumber.value)
})

const newComment = ref('')
const addComment = async () => {
  if (!selectedOntology.value?.owner || !selectedOntology.value.repo || issueNumber.value === undefined) {
    return
  }
  await gitHubService.addIssueComment(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    issueNumber.value,
    newComment.value)
  newComment.value = ''
  comments.value = await gitHubService.getIssueComments(
    selectedOntology.value.owner,
    selectedOntology.value.repo,
    issueNumber.value)
}

</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <p>{{ issue?.body }}</p>
    <div
      v-for="comment in comments"
      :key="comment.id"
      class="ml-4"
    >
      <p>{{ comment.body }}</p>
    </div>
    <Textarea
      v-model="newComment"
      rows="3"
      cols="30"
      placeholder="Add a comment"
    ></Textarea>
    <Button
      label="Add Comment"
      @click="addComment()"
    />
  </div>
</template>