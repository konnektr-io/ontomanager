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

    return atob(response.data.content)
  }

  // Add more methods for creating commits, pull requests, etc.
}

export default new GitHubService()
