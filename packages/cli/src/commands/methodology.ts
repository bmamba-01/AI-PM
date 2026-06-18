import { Command } from 'commander';
import chalk from 'chalk';
import { Methodology } from '@ai-pm/core/domain';

const msgs = {
  en: {
    current: 'Current methodology: ',
    set: 'Methodology set to ',
    invalid: 'Invalid methodology. Use: scrum, waterfall, kanban, hybrid',
    methods: {
      scrum: 'Scrum',
      waterfall: 'Waterfall',
      kanban: 'Kanban',
      hybrid: 'Hybrid',
    },
  },
  vi: {
    current: 'Phương pháp hiện tại: ',
    set: 'Đã đặt phương pháp thành ',
    invalid: 'Phương pháp không hợp lệ. Dùng: scrum, waterfall, kanban, hybrid',
    methods: {
      scrum: 'Scrum',
      waterfall: 'Waterfall',
      kanban: 'Kanban',
      hybrid: 'Hybrid',
    },
  },
};

function getLang(): keyof typeof msgs { return 'en'; }

export const methodologyCommand = new Command('methodology');

methodologyCommand
  .description('Manage project methodology')
  .addCommand(
    new Command('set')
      .description('Set methodology for project')
      .argument('<type>', 'Methodology type (scrum, waterfall, kanban, hybrid)')
      .action((type: string) => {
        const lang = getLang();
        const t = msgs[lang];
        const methodMap: Record<string, Methodology> = {
          scrum: Methodology.SCRUM,
          waterfall: Methodology.WATERFALL,
          kanban: Methodology.KANBAN,
          hybrid: Methodology.HYBRID,
        };
        const normalized = type.toLowerCase();
        if (!(normalized in methodMap)) {
          console.log(chalk.red(t.invalid));
          process.exit(1);
        }
        console.log(chalk.green(`${t.set}${t.methods[normalized as keyof typeof t.methods]}`));
      })
  )
  .addCommand(
    new Command('current')
      .description('Show current methodology')
      .action(() => {
        const lang = getLang();
        const t = msgs[lang];
        console.log(chalk.blue(`${t.current}${t.methods.scrum}`));
      })
  );
