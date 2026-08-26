import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const sourceRoot = fileURLToPath(new URL('../src', import.meta.url))
const booleanPrefixPattern = /^(?:can|does|has|is|should)[A-Z]/
const eventHandlerPattern = /^(?:handle|on)[A-Z]/
const forbiddenShortNames = new Set([
  'cls',
  'closeB',
  'err',
  'i',
  'k',
  'len',
  'm',
  'n',
  'openB',
  'out',
  'pos',
  's',
  'v',
  'vals',
])
const allowedBooleanNames = new Set(['value'])
const violations = []

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectSourceFiles(entryPath))
    else if (['.ts', '.tsx'].includes(extname(entry.name))) files.push(entryPath)
  }

  return files
}

const getIdentifierName = name => ts.isIdentifier(name) ? name.text : null

const isBooleanInitializer = initializer => initializer
  && (initializer.kind === ts.SyntaxKind.TrueKeyword
    || initializer.kind === ts.SyntaxKind.FalseKeyword)

for (const file of await collectSourceFiles(sourceRoot)) {
  const source = await readFile(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    extname(file) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const report = (node, message) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    violations.push(`${relative(process.cwd(), file)}:${line + 1} ${message}`)
  }

  const checkShortName = (name, node) => {
    if (name && forbiddenShortNames.has(name)) {
      report(node, `标识符 ${name} 含义不清`)
    }
  }

  const checkBooleanName = (name, node) => {
    if (name && !allowedBooleanNames.has(name) && !booleanPrefixPattern.test(name)) {
      report(node, `Boolean 标识符 ${name} 缺少语义前缀`)
    }
  }

  const visit = node => {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))
      && /^I[A-Z]/.test(node.name.text)
    ) {
      report(node.name, `类型 ${node.name.text} 不应使用 I 前缀`)
    }

    if (
      ts.isFunctionDeclaration(node)
      && node.name
      && /^[A-Z]/.test(node.name.text)
    ) {
      report(node.name, `React 组件 ${node.name.text} 必须使用 const 箭头函数声明`)
    }

    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) {
      const name = getIdentifierName(node.name)
      checkShortName(name, node.name)
      if (node.type?.kind === ts.SyntaxKind.BooleanKeyword || isBooleanInitializer(node.initializer)) {
        checkBooleanName(name, node.name)
      }
    }

    if (ts.isBindingElement(node)) {
      checkShortName(getIdentifierName(node.name), node.name)
    }

    if (
      (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node))
      && node.type?.kind === ts.SyntaxKind.BooleanKeyword
    ) {
      checkBooleanName(getIdentifierName(node.name), node.name)
    }

    if (
      ts.isJsxAttribute(node)
      && /^on[A-Z]/.test(node.name.text)
      && node.initializer
      && ts.isJsxExpression(node.initializer)
      && node.initializer.expression
      && ts.isIdentifier(node.initializer.expression)
      && !eventHandlerPattern.test(node.initializer.expression.text)
    ) {
      report(
        node.initializer.expression,
        `事件回调 ${node.initializer.expression.text} 应使用 handleXxx 或 onXxx 命名`,
      )
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

if (violations.length > 0) {
  console.error('代码命名规范检查失败：')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  process.stdout.write('✓ 类型、Boolean、事件处理函数和组件声明命名符合规范\n')
}
