import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'build']);

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function runInit(projectName: string) {
  const root = process.cwd();
  const target = path.join(root, projectName);

  if (fs.existsSync(target)) {
    console.error(`Folder "${projectName}" already exists. Aborting.`);
    process.exit(1);
  }

  console.log(`Creating project "${projectName}"...`);

  // Find repo root (CLI is at packages/cli/dist/commands/init.js → repo root is 4 levels up)
  const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');

  // Create target structure
  fs.mkdirSync(path.join(target, 'packages'), { recursive: true });

  // Copy skeleton packages
  const packages = ['desktop', 'mobile', 'core', 'mcp', 'agents', 'shared'];
  for (const pkg of packages) {
    const src = path.join(repoRoot, 'packages', pkg);
    const dest = path.join(target, 'packages', pkg);
    if (fs.existsSync(src)) {
      copyDirRecursive(src, dest);
      console.log(`  ✓ packages/${pkg}`);
    } else {
      console.log(`  ⚠ packages/${pkg} (source not found, skipped)`);
    }
  }

  // Copy root config files
  const rootFiles = ['package.json', 'pnpm-workspace.yaml', 'tsconfig.base.json'];
  for (const f of rootFiles) {
    const src = path.join(repoRoot, f);
    const dest = path.join(target, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ ${f}`);
    }
  }

  // Create .ai-pm runtime directories
  const aiPmDir = path.join(target, '.ai-pm');
  fs.mkdirSync(path.join(aiPmDir, 'memory'), { recursive: true });
  fs.mkdirSync(path.join(aiPmDir, 'audit'), { recursive: true });
  fs.mkdirSync(path.join(aiPmDir, 'approvals'), { recursive: true });
  console.log('  ✓ .ai-pm/ (runtime data)');

  // Create .gitignore for runtime data
  fs.writeFileSync(
    path.join(target, '.gitignore'),
    [
      'node_modules/',
      'dist/',
      '.ai-pm/memory/',
      '.ai-pm/audit/',
      '.ai-pm/approvals.json',
      '.ai-pm/approvals/',
      '',
    ].join('\n')
  );
  console.log('  ✓ .gitignore');

  // Create a basic README
  fs.writeFileSync(
    path.join(target, 'README.md'),
    `# ${projectName}\n\nInitialized with AI-PM Toolkit.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`
  );
  console.log('  ✓ README.md');

  console.log(`\n✅ Project "${projectName}" created successfully!`);
  console.log(`\nNext steps:\n  cd ${projectName}\n  npm install\n  npm run dev`);
}
