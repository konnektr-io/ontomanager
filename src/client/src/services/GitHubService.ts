import { Octokit } from '@octokit/rest'
import axios from 'axios'

export interface GitHubTokenData {
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_token_expires_in: number
  scope: string
  token_type: string
}

export interface GitHubExtendedTokenData extends GitHubTokenData {
  access_token_expiry: number
  refresh_token_expiry: number
}

class GitHubService {
  private octokit: Octokit
  private tokenData: GitHubExtendedTokenData | null = null

  public constructor() {
    this.octokit = new Octokit()
    this.loadTokenData()
  }

  private loadTokenData() {
    const tokenData = localStorage.getItem('githubTokenData')
    if (tokenData) {
      this.tokenData = JSON.parse(tokenData)
      if (
        this.tokenData?.access_token &&
        !this.isTokenExpired(this.tokenData.access_token_expiry)
      ) {
        this.octokit = new Octokit({ auth: this.tokenData.access_token })
      }
    }
  }

  public saveTokenData(tokenData: GitHubTokenData) {
    this.tokenData = {
      ...tokenData,
      access_token_expiry: Date.now() + tokenData.expires_in * 1000,
      refresh_token_expiry: Date.now() + tokenData.refresh_token_expires_in * 1000
    }
    localStorage.setItem('githubTokenData', JSON.stringify(tokenData))
    this.octokit = new Octokit({ auth: tokenData.access_token })
  }

  public async exchangeCodeForToken(code: string) {
    const response = await axios.post<GitHubTokenData>(
      '/api/github/oauth/token',
      new URLSearchParams({ code }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
    this.saveTokenData(response.data)
    return response.data
  }

  private async refreshToken() {
    try {
      if (!this.tokenData) {
        return
      }
      const response = await axios.post(
        '/api/github/oauth/refresh_token',
        new URLSearchParams({
          refresh_token: this.tokenData.refresh_token
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
      this.saveTokenData(response.data)
    } catch (error) {
      console.error('Error refreshing token', error)
    }
  }

  private isTokenExpired(tokenExpiry: number) {
    return Date.now() > tokenExpiry
  }

  public async authenticate(token: string) {
    this.octokit = new Octokit({ auth: token })
    const user = await this.getUser()
    return user
  }

  public async silentLogin() {
    if (
      this.tokenData &&
      this.tokenData.access_token &&
      this.tokenData.refresh_token &&
      this.tokenData.access_token_expiry &&
      this.tokenData.refresh_token_expiry
    ) {
      try {
        if (this.isTokenExpired(this.tokenData.access_token_expiry)) {
          if (this.isTokenExpired(this.tokenData.refresh_token_expiry)) {
            console.warn('Refresh token expired')
            return false
          } else {
            await this.refreshToken()
          }
        }
        const user = await this.getUser()
        return user
      } catch (error) {
        console.warn('Error during silent login', error)
      }
    }
    return null
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
      ref,
      mediaType: { format: 'application/vnd.github.raw+json' }
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
