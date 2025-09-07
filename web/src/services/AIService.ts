import axios from 'axios'

class AIService {
  async suggestCommitMessage(changes: string): Promise<string> {
    const response = await axios.post('/api/ai/suggest-commit-message', { changes })
    return response.data.message
  }
}

export default new AIService()