'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.NlmMcpClient = exports.NlmClientError = void 0;
// Vendored copy of src/shared/lib/notebooklm/client.ts
// Duplicated here so the Cloud Function is self-contained (no Next.js deps)
const child_process_1 = require('child_process');
const util_1 = require('util');
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Custom error class for NotebookLM client operations.
 */
class NlmClientError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NlmClientError';
  }
}
exports.NlmClientError = NlmClientError;
/**
 * NotebookLM MCP Client
 * Wraps the notebooklm-mcp-cli tool for programmatic interaction.
 */
class NlmMcpClient {
  async runCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stdout) {
        throw new Error(stderr);
      }
      return stdout.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new NlmClientError(`CLI command failed: ${command}. Error: ${message}`);
    }
  }
  async createNotebook(profileName, title) {
    const output = await this.runCommand(`nlm notebook create --profile ${profileName} "${title}"`);
    const match = output.match(/Created notebook: ([a-zA-Z0-9_-]+)/i);
    if (!match) {
      throw new NlmClientError(`Failed to parse notebook ID from output: ${output}`);
    }
    return match[1];
  }
  async addSource(profileName, notebookId, sourceType, value) {
    const sourceFlag =
      sourceType === 'url' ? '--url' : sourceType === 'file' ? '--file' : `--${sourceType}`;
    await this.runCommand(
      `nlm source add --profile ${profileName} ${notebookId} ${sourceFlag} "${value}"`,
    );
  }
  async query(profileName, notebookId, prompt) {
    return await this.runCommand(
      `nlm query notebook --profile ${profileName} ${notebookId} "${prompt}"`,
    );
  }
  async generate(profileName, notebookId, jobType) {
    return await this.runCommand(
      `nlm studio generate --profile ${profileName} --notebook ${notebookId} --type ${jobType}`,
    );
  }
  async deleteNotebook(profileName, notebookId) {
    await this.runCommand(`nlm notebook delete --profile ${profileName} --confirm ${notebookId}`);
  }
}
exports.NlmMcpClient = NlmMcpClient;
//# sourceMappingURL=notebooklm-client.js.map
