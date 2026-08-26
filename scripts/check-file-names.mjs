import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceRoot = fileURLToPath(new URL('../src', import.meta.url))
const directoryNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const fileNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:d|module|spec|stories|test))?\.[a-z0-9]+$/

const invalidPaths = []
let checkedFiles = 0

async function checkDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!directoryNamePattern.test(entry.name)) invalidPaths.push(entryPath)
      await checkDirectory(entryPath)
      continue
    }

    checkedFiles += 1
    if (!fileNamePattern.test(entry.name)) invalidPaths.push(entryPath)
  }
}

await checkDirectory(sourceRoot)

if (invalidPaths.length > 0) {
  console.error('以下 src 路径不符合 kebab-case 命名规范：')
  for (const path of invalidPaths) console.error(`- ${relative(process.cwd(), path)}`)
  process.exitCode = 1
} else {
  process.stdout.write(`✓ src 文件名均符合 kebab-case（${checkedFiles} 个文件）\n`)
}
