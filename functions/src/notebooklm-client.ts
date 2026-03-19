// Vendored copy of src/shared/lib/notebooklm/client.ts
// Duplicated here so the Cloud Function is self-contained (no Next.js deps)
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Custom error class for NotebookLM client operations.
 */
export class NlmClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NlmClientError';
  }
}

/**
 * NotebookLM MCP Client
 * Wraps the notebooklm-mcp-cli tool for programmatic interaction.
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

  async createNotebook(profileName: string, title: string): Promise<string> {
    const output = await this.runCommand(`nlm notebook create --profile ${profileName} "${title}"`);
    const match = output.match(/Created notebook: ([a-zA-Z0-9_-]+)/i);
    if (!match) {
      throw new NlmClientError(`Failed to parse notebook ID from output: ${output}`);
    }
    return match[1];
  }

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

  async query(profileName: string, notebookId: string, prompt: string): Promise<string> {
    return await this.runCommand(
      `nlm query notebook --profile ${profileName} ${notebookId} "${prompt}"`,
    );
  }

  async generate(profileName: string, notebookId: string, jobType: string): Promise<string> {
    return await this.runCommand(
      `nlm studio generate --profile ${profileName} --notebook ${notebookId} --type ${jobType}`,
    );
  }

  async deleteNotebook(profileName: string, notebookId: string): Promise<void> {
    await this.runCommand(`nlm notebook delete --profile ${profileName} --confirm ${notebookId}`);
  }
}
