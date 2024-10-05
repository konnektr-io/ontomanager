import { Octokit } from '@octokit/rest';

class GitHubService {
  private octokit: Octokit;

  constructor (token?: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepositories (username: string) {
    const response = await this.octokit.repos.listForUser({ username });
    return response.data;
  }

  async getBranches (owner: string, repo: string) {
    const response = await this.octokit.repos.listBranches({ owner, repo });
    return response.data;
  }

  async getFileContent (owner: string, repo: string, path: string, ref?: string) {
    const response = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(response.data) || !('content' in response.data)) {
      throw new Error('File not found or is a directory');
    }

    return Buffer.from(response.data.content, 'base64').toString('utf-8');
  }

  // Add more methods for creating commits, pull requests, etc.
}

export default GitHubService;