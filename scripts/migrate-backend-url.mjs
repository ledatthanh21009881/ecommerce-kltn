/**
 * One-off: route handlers dùng getBackendBaseUrl() từ config thay vì hardcode VPS.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMPORT_LINE =
  "import { getBackendBaseUrl } from '@/app/api/backend/config'\n"

const HARDCODED =
  /const BACKEND_URL = process\.env\.(?:BACKEND_URL|NEXT_PUBLIC_API_URL) \|\| 'http:\/\/103\.90\.225\.212:8000'\s*\n/g

const HARDCODED2 =
  /const BACKEND_URL = process\.env\.BACKEND_URL \|\| 'http:\/\/103\.90\.225\.212:8000'\s*\n/g

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, files)
    else if (name === 'route.ts' || name.endsWith('page.tsx') && dir.includes('app'))
      files.push(p)
  }
  return files
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  if (!content.includes('103.90.225.212:8000') && !content.includes('${BACKEND_URL}')) {
    return false
  }

  content = content.replace(HARDCODED, '')
  content = content.replace(HARDCODED2, '')

  content = content.replace(/\$\{BACKEND_URL\}/g, '${getBackendBaseUrl()}')

  content = content.replace(
    /process\.env\.BACKEND_URL \|\| 'http:\/\/103\.90\.225\.212:8000'/g,
    "getBackendBaseUrl()",
  )
  content = content.replace(
    /process\.env\.NEXT_PUBLIC_API_URL \|\| 'http:\/\/103\.90\.225\.212:8000'/g,
    "getBackendBaseUrl()",
  )

  if (content.includes('getBackendBaseUrl') && !content.includes("@/app/api/backend/config")) {
    const lines = content.split('\n')
    const firstImport = lines.findIndex((l) => l.startsWith('import '))
    if (firstImport >= 0) {
      lines.splice(firstImport, 0, IMPORT_LINE.trim())
    } else {
      lines.unshift(IMPORT_LINE.trim(), '')
    }
    content = lines.join('\n')
  }

  // messenger hardcoded base
  content = content.replace(
    /const BACKEND_BASE_URL = 'http:\/\/103\.90\.225\.212:8000\/api\/backend\/v1'/g,
    "const BACKEND_BASE_URL = getBackendApiV1Base()",
  )

  fs.writeFileSync(filePath, content)
  return true
}

const targets = [
  ...walk(path.join(root, 'app', 'api')),
  path.join(root, 'app', 'page.tsx'),
  path.join(root, 'app', 'about', 'page.tsx'),
  path.join(root, 'app', 'layout.tsx'),
].filter((p) => fs.existsSync(p))

let n = 0
for (const f of targets) {
  if (migrateFile(f)) {
    n++
    console.log('updated', path.relative(root, f))
  }
}

console.log('done', n, 'files')
