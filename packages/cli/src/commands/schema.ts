import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { loadWorkflowSchema, validateWorkflowOutput } from '@ai-pm/core/workflows';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const msgs = {
  en: {
    title: 'Schema Validation',
    loading: 'Loading schema...',
    listTitle: 'Available Workflow Schemas',
    workflowId: 'Workflow ID',
    description: 'Description',
    valid: 'Valid',
    invalid: 'Invalid',
    errors: 'Errors',
    warnings: 'Warnings',
    noSchemas: 'No schemas found.',
    schemaNotFound: 'Schema not found for workflow:',
    fileNotFound: 'Input file not found:',
    validationFailed: 'Validation failed',
    validationPassed: 'Validation passed',
    jsonOutput: 'JSON output enabled',
  },
  vi: {
    title: 'Xác Thực Schema',
    loading: 'Đang tải schema...',
    listTitle: 'Schema Workflow Có Sẵn',
    workflowId: 'Mã Workflow',
    description: 'Mô Tả',
    valid: 'Hợp Lệ',
    invalid: 'Không Hợp Lệ',
    errors: 'Lỗi',
    warnings: 'Cảnh Báo',
    noSchemas: 'Không tìm thấy schema nào.',
    schemaNotFound: 'Không tìm thấy schema cho workflow:',
    fileNotFound: 'Không tìm thấy file:',
    validationFailed: 'Xác thực thất bại',
    validationPassed: 'Xác thực thành công',
    jsonOutput: 'Đang xuất JSON',
  },
};

function getLang(): keyof typeof msgs {
  return 'en';
}

export const schemaCommand = new Command('schema');

schemaCommand
  .description('Validate workflow outputs against JSON schemas')
  .addCommand(
    new Command('list')
      .description('List available workflow schemas')
      .option('--json', 'Output as JSON')
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const spinner = ora(msgsLang.loading).start();

        try {
          // List schema files from the default schemas directory
          const schemasDir = path.resolve(__dirname, '../../../../schemas/workflows');
          const { readdir } = await import('node:fs/promises');
          const files = await readdir(schemasDir);
          const schemaFiles = files.filter(f => f.endsWith('.schema.json'));

          spinner.succeed('Done');

          if (schemaFiles.length === 0) {
            console.log(chalk.yellow(msgsLang.noSchemas));
            return;
          }

          const schemas = [];
          for (const f of schemaFiles) {
            const workflowId = f.replace('.output.schema.json', '');
            const schemaContent = await readFile(path.join(schemasDir, f), 'utf-8');
            const schema = JSON.parse(schemaContent);
            schemas.push({
              workflowId,
              description: schema.description || '',
              required: schema.required || [],
            });
          }

          if (opts.json) {
            console.log(JSON.stringify({ schemas, total: schemas.length }, null, 2));
            return;
          }

          console.log(chalk.blue(`\n${msgsLang.listTitle}\n`));
          console.log(
            table([
              [chalk.bold(msgsLang.workflowId), chalk.bold(msgsLang.description)],
              ...schemas.map(s => [s.workflowId, s.description]),
            ])
          );
          console.log(chalk.gray(`\nTotal: ${schemas.length} schemas`));
        } catch (error) {
          spinner.fail(msgsLang.loading + ' failed');
          console.error(error);
        }
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate a JSON file against a workflow schema')
      .requiredOption('--workflow <workflow-id>', 'Workflow ID to validate against')
      .requiredOption('--input <file>', 'Input JSON file to validate')
      .option('--json', 'Output as JSON')
      .action(async (opts) => {
        const lang = getLang();
        const msgsLang = msgs[lang];
        const spinner = ora(msgsLang.loading).start();

        try {
          // Load schema
          const schema = await loadWorkflowSchema(opts.workflow);
          if (!schema) {
            spinner.fail();
            console.error(chalk.red(`${msgsLang.schemaNotFound} ${opts.workflow}`));
            process.exit(1);
          }

          // Load input file
          let inputData: unknown;
          try {
            const raw = await readFile(opts.input, 'utf-8');
            inputData = JSON.parse(raw);
          } catch (err) {
            spinner.fail();
            console.error(chalk.red(`${msgsLang.fileNotFound} ${opts.input}`));
            process.exit(1);
          }

          // Validate
          const result = await validateWorkflowOutput(opts.workflow, inputData);
          spinner.succeed();

          if (result.valid) {
            console.log(chalk.green(`✓ ${msgsLang.validationPassed}`));
            if (result.warnings.length > 0) {
              console.log(chalk.yellow(`⚠ ${result.warnings.join('\n⚠ ')}`));
            }
            if (opts.json) {
              console.log(JSON.stringify(result, null, 2));
            }
            process.exit(0);
          } else {
            console.log(chalk.red(`✗ ${msgsLang.validationFailed}`));
            if (opts.json) {
              console.log(JSON.stringify(result, null, 2));
            } else {
              console.log(chalk.red(result.errors.map(e => `  - ${e}`).join('\n')));
            }
            process.exit(1);
          }
        } catch (error) {
          spinner.fail();
          console.error(error);
          process.exit(1);
        }
      })
  );

// Simple table helper for non-JSON output
function table(data: (string | undefined)[][]): string {
  const colWidths = data[0].map((_, i) => Math.max(...data.map(row => String(row[i] ?? '').length)));
  return data
    .map((row, i) =>
      row
        .map((cell, j) => String(cell ?? '').padEnd(colWidths[j]))
        .join('  ')
    )
    .join('\n');
}