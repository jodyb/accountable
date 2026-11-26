// PreToolUse hook: refuse any edit to .env (or .env.local and the like), whether through a
// file tool or a shell command. .env.example is a template and stays editable.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8') || '{}')
const tool = input.tool_name ?? ''
const args = input.tool_input ?? {}

const isEnvFile = (path) => {
  const name = basename(path)
  return /^\.env(\..+)?$/.test(name) && name !== '.env.example'
}

// A shell command that names a .env file at all: there are too many ways to write one to tell apart.
const ENV_IN_COMMAND = /(^|[\s'"=/<>(])\.env(?!\.example\b)(\.[\w.-]+)?(?=$|[\s'";|&)<>])/

function touchesEnv() {
  if (tool === 'Bash') return ENV_IN_COMMAND.test(args.command ?? '')
  const path = args.file_path ?? args.notebook_path ?? args.path ?? ''
  return path !== '' && isEnvFile(path)
}

if (touchesEnv()) {
  process.stderr.write(
    '.env holds your own secrets, so this project does not let Claude edit it. ' +
      'Ask the user to make the change themselves.\n',
  )
  process.exit(2)
}
process.exit(0)
