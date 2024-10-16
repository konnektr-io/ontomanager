import { Octokit } from '@octokit/rest'
// import { Buffer } from 'buffer'

class GitHubService {
  private octokit: Octokit

  public constructor() {
    this.octokit = new Octokit()
  }

  public async authenticate(token: string) {
    this.octokit = new Octokit({
      auth: token
    })
    return await this.getUser()
  }

  public async getUser() {
    const response = await this.octokit.users.getAuthenticated()
    return response.data
  }

  public async getRepositories(username: string) {
    const response = await this.octokit.repos.listForUser({ username })
    return response.data
  }

  public async getBranches(owner: string, repo: string) {
    const response = await this.octokit.repos.listBranches({ owner, repo })
    return response.data
  }

  public async getFileContent(owner: string, repo: string, path: string, ref?: string) {
    const response = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref
    })

    if (Array.isArray(response.data) || !('content' in response.data)) {
      throw new Error('File not found or is a directory')
    }

    const content = response.data.content
    const decodedContent = atob(content)
    const uint8Array = new Uint8Array(decodedContent.split('').map((char) => char.charCodeAt(0)))
    const textDecoder = new TextDecoder('utf-8')
    return textDecoder.decode(uint8Array)
  }

  public async commitFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string
  ) {
    const response = await this.octokit.repos
      .getContent({
        owner,
        repo,
        path,
        ref: branch
      })
      .catch(() => null)

    const sha =
      response && !Array.isArray(response.data) && 'sha' in response.data
        ? response.data.sha
        : undefined

    const encodedContent = new TextEncoder()
      .encode(content)
      .reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    const base64EncodedContent = btoa(encodedContent)

    const commitResponse = await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: base64EncodedContent,
      sha,
      branch
    })

    return commitResponse.data
  }
}

export default new GitHubService()
