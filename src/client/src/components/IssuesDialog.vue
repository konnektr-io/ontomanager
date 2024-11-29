<script setup lang="ts">
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import { TreeType, useGraphStore } from '@/stores/graph'
import gitHubService from '@/services/GitHubService'

const dialogRef = inject<Ref<DynamicDialogInstance & {
  data: {
    parentUri: string;
    type: TreeType;
    graphId: string;
    issueId: number;
  }
}>>('dialogRef')
const parentUri = computed(() => dialogRef?.value.data.parentUri)
const type = computed(() => dialogRef?.value.data.type)
const graphId = computed(() => dialogRef?.value.data.graphId)
const issueId = computed(() => dialogRef?.value.data.graphId)

const comments = ref([])

onMounted(async () => {
  comments.value = await gitHubService.getIssueComments(issueId.value)
})

</script>

<template>
  <div class="flex flex-col gap-2 w-full">
    <div
      v-for="issue in issues"
      :key="issue.number"
      class="mb-4"
    >
      <h4>{{ issue.title }}</h4>
      <p>{{ issue.body }}</p>
      <div
        v-for="comment in issue.comments"
        :key="comment.id"
        class="ml-4"
      >
        <p>{{ comment.body }}</p>
      </div>
      <InputTextarea
        v-model="newComment"
        rows="3"
        cols="30"
        placeholder="Add a comment"
      ></InputTextarea>
      <Button
        label="Add Comment"
        @click="addComment(issue.number)"
      />
    </div>
    <h3>Create New Issue</h3>
    <InputText
      v-model="newIssueTitle"
      placeholder="Issue Title"
    />
    <InputTextarea
      v-model="newIssueBody"
      rows="3"
      cols="30"
      placeholder="Issue Body"
    ></InputTextarea>
    <div class="flex justify-end gap-2 mt-4">
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