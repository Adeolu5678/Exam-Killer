const { NlmMcpClient } = require('./src/shared/lib/notebooklm/client');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function list() {
  // Since I can't easily parse output from NLM CLI via script without knowing stdout exact format,
  // I'll try to find the notebook ID by running a command and returning its output.
  const client = new NlmMcpClient();
  // We don't have a listNotebooks method in the client, but we can attempt to create it
  // and see if it already exists or just list using child_process.
  const { exec } = require('child_process');
  exec('npx nlm notebook list --profile nlm_01', (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
  });
}
list().catch(console.error);
