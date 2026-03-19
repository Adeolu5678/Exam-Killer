import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * NotebookLM MCP Client
 * Wraps the notebooklm-mcp-cli (v0.4.8) tool for programmatic interaction.
 */
export class NlmMcpClient {
  private async runCommand(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stdout) {
        throw new Error(stderr);
      }
      return stdout.trim();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new NlmClientError(`CLI command failed: ${command}. Error: ${message}`);
    }
  }

  /**
   * Creates a new notebook on the given profile.
   * Returns the notebook ID by parsing stdout.
   */
  async createNotebook(profileName: string, title: string): Promise<string> {
    const output = await this.runCommand(`nlm notebook create --profile ${profileName} "${title}"`);
    // Expected output contains the notebook ID, e.g., "Created notebook: <id>"
    // We need to extract the ID.
    const match = output.match(/Created notebook: ([a-zA-Z0-9_-]+)/i);
    if (!match) {
      throw new NlmClientError(`Failed to parse notebook ID from output: ${output}`);
    }
    return match[1];
  }

  /**
   * Adds a source to a notebook.
   * sourceType: 'url' | 'file' | 'youtube' | 'gdrive'
   */
  async addSource(
    profileName: string,
    notebookId: string,
    sourceType: string,
    value: string,
  ): Promise<void> {
    const sourceFlag =
      sourceType === 'url' ? '--url' : sourceType === 'file' ? '--file' : `--${sourceType}`;
    await this.runCommand(
      `nlm source add --profile ${profileName} ${notebookId} ${sourceFlag} "${value}"`,
    );
  }

  /**
   * Sends a chat query to a notebook.
   * Returns the response text.
   */
  async query(profileName: string, notebookId: string, prompt: string): Promise<string> {
    return await this.runCommand(
      `nlm query notebook --profile ${profileName} ${notebookId} "${prompt}"`,
    );
  }

  /**
   * Requests a Studio output.
   * jobType: 'audio' | 'video' | 'infographic' | 'flashcards' | 'quiz' | 'mind-map' | 'study-guide'
   * Returns the raw output (text or URL/path).
   */
  async generate(profileName: string, notebookId: string, jobType: string): Promise<string> {
    return await this.runCommand(
      `nlm studio generate --profile ${profileName} --notebook ${notebookId} --type ${jobType}`,
    );
  }

  /**
   * Deletes a notebook.
   */
  async deleteNotebook(profileName: string, notebookId: string): Promise<void> {
    await this.runCommand(`nlm notebook delete --profile ${profileName} --confirm ${notebookId}`);
  }
}

/**
 * Custom error class for NotebookLM client operations.
 */
export class NlmClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NlmClientError';
  }
}
