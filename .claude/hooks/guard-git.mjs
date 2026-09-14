// PreToolUse guard on Bash: agents may use Git on any branch but `main`
// (`specs/mission.md` §8.1, `.claude/rules/autonomous-sdd.md`, "Git on feature
// branches").
//
// Exit 2 blocks the call and hands stderr back to the agent. The parse is
// shell-shaped rather than a shell parser, and errs towards blocking. It is
// the first of three lines: the husky `pre-commit` and `pre-push` hooks catch
// Git run indirectly, and only protection on GitHub cannot be argued with.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

const WRAPPERS = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nohup', 'xargs']);
const SHELLS = new Set(['bash', 'sh', 'zsh']);
const SUBAGENT_FORBIDDEN = new Set([
  'commit',
  'push',
  'merge',
  'cherry-pick',
  'revert',
  'am',
  'rebase',
]);
const MAIN_FORBIDDEN = new Set(['commit', 'cherry-pick', 'revert', 'am', 'rebase']);
const ALWAYS_FORBIDDEN = new Set(['update-ref', 'filter-branch', 'filter-repo', 'replace']);
const GH_READ_ONLY = {
  pr: new Set(['view', 'list', 'status', 'checks', 'diff']),
  release: new Set(['view', 'list']),
  repo: new Set(['view', 'list', 'clone']),
  workflow: new Set(['view', 'list']),
  run: new Set(['view', 'list', 'watch', 'rerun', 'download']),
};

const block = (reason) => {
  process.stderr.write(
    `guard-git: ${reason}. See specs/mission.md §8.1 and .claude/rules/autonomous-sdd.md ("Git on feature branches"). Stop and report; do not route around it.\n`,
  );
  process.exit(2);
};

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const command = input.tool_input?.command ?? '';
const inSubagent = Boolean(input.agent_id);
let cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();

if (
  /\bHUSKY=0\b|core\.hooksPath|--no-verify|\bunset\s+CLAUDECODE\b|-u\s*CLAUDECODE\b|\bCLAUDECODE=/.test(
    command,
  )
) {
  block('the Git hooks may not be bypassed or disabled');
}

const unquote = (token) => token.replace(/^[('"]+|[)'"]+$/g, '');

const branchIn = (dir) => {
  try {
    return execFileSync('git', ['-C', dir, 'symbolic-ref', '--short', '-q', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

// The command word of a simple command, past assignments, wrappers and `bash -c`.
const commandStart = (tokens) => {
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (
      /^\w+=/.test(token) ||
      WRAPPERS.has(token) ||
      (token.startsWith('-') && i > 0 && WRAPPERS.has(tokens[i - 1]))
    ) {
      i += 1;
    } else if (SHELLS.has(token) && tokens[i + 1] === '-c') {
      i += 2;
    } else {
      return i;
    }
  }
  return i;
};

const isMain = (ref) => /^(\+)?([^:]*:)?(refs\/heads\/)?main$/.test(ref);

const checkGit = (args, dir) => {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const option = args[i];
    if (option === '-C') {
      dir = resolve(dir, args[i + 1] ?? '.');
      i += 2;
    } else if (['-c', '--git-dir', '--work-tree', '--namespace'].includes(option)) {
      i += 2;
    } else {
      i += 1;
    }
  }
  const sub = args[i];
  const rest = args.slice(i + 1);
  if (!sub) return;
  const branch = branchIn(dir);
  const onMain = branch === 'main';
  const ffOnly = rest.includes('--ff-only');

  if (ALWAYS_FORBIDDEN.has(sub)) block(`\`git ${sub}\` rewrites refs directly`);
  if (inSubagent && SUBAGENT_FORBIDDEN.has(sub))
    block(`subagents do not \`git ${sub}\` — the orchestrator commits and pushes`);
  if (inSubagent && sub === 'pull' && !ffOnly) block('subagents may only `git pull --ff-only`');
  if (onMain && MAIN_FORBIDDEN.has(sub))
    block(`no \`git ${sub}\` on main — switch to the feature branch`);
  if (onMain && (sub === 'merge' || sub === 'pull') && !ffOnly) {
    block(
      `no \`git ${sub}\` on main except --ff-only — the owner merges main through a pull request`,
    );
  }

  if (sub === 'commit') {
    if (rest.includes('--amend')) block('no `git commit --amend` — correct with a new commit');
    if (
      rest.some(
        (token) => token === '-n' || (/^-[a-zA-Z]{2,4}$/.test(token) && token.includes('n')),
      )
    ) {
      block('`git commit -n` skips the Git hooks');
    }
  }

  if (sub === 'rebase') block('no `git rebase` — it rewrites history');
  if (sub === 'reset' && rest.includes('--hard')) block('no `git reset --hard`');

  if (sub === 'push') {
    const forceOrWide = /^(-f|--force.*|--mirror|--delete|-d|--prune|--all|--tags|--follow-tags)$/;
    const flag = rest.find((token) => forceOrWide.test(token));
    if (flag)
      block(`no \`git push ${flag}\` — plain fast-forward pushes of the feature branch only`);
    const positional = [];
    for (let j = 0; j < rest.length; j += 1) {
      if (['-o', '--push-option', '--repo', '--receive-pack', '--exec'].includes(rest[j])) j += 1;
      else if (!rest[j].startsWith('-')) positional.push(rest[j]);
    }
    const refspecs = positional.slice(1);
    if (refspecs.length === 0 && onMain)
      block('no push from main — the owner merges it through a pull request');
    for (const refspec of refspecs) {
      if (isMain(refspec) || (refspec === 'HEAD' && onMain))
        block('no push to main — the owner merges it through a pull request');
      if (refspec.startsWith('+')) block(`no forced refspec \`${refspec}\``);
      if (refspec.startsWith(':')) block(`no remote branch deletion \`${refspec}\``);
    }
  }

  if (sub === 'tag' && !(rest.length === 0 || rest.includes('-l') || rest.includes('--list')))
    block("tags are the owner's");

  if (
    sub === 'branch' &&
    rest.some((token) => /^(-d|-D|--delete|-f|--force|-m|-M|--move)$/.test(token))
  ) {
    block('no deleting, forcing, or renaming branches');
  }

  if (sub === 'config') {
    const reads = rest.some((token) =>
      /^(--get|--get-all|--get-regexp|--list|-l|--show-origin|--show-scope)$/.test(token),
    );
    const positional = rest.filter((token) => !token.startsWith('-'));
    if (!reads && positional.length !== 1) block("Git configuration is the owner's");
  }
};

const checkGh = (args) => {
  const [group, sub] = args;
  const readOnly = GH_READ_ONLY[group];
  if (readOnly && !readOnly.has(sub)) {
    block(
      `no \`gh ${group} ${sub ?? ''}\`${group === 'pr' ? ' — the owner opens and merges pull requests' : ''}`,
    );
  }
  if (group === 'api') {
    const method =
      args.find((token, index) => ['-X', '--method'].includes(args[index - 1])) ??
      args.find((token) => /^--method=/.test(token))?.slice(9);
    const writes = args.some(
      (token) =>
        /^(-f|-F|--field|--raw-field|--input)$/.test(token) ||
        /^(--field|--raw-field|--input)=/.test(token),
    );
    if ((method && method.toUpperCase() !== 'GET') || writes) block('no writing `gh api` calls');
  }
};

for (const segment of command.split(/&&|\|\||[;|&\n]|\$\(|`/)) {
  const tokens = segment.trim().split(/\s+/).filter(Boolean).map(unquote).filter(Boolean);
  const start = commandStart(tokens);
  const word = tokens[start];
  const args = tokens.slice(start + 1);
  if (word === 'cd') {
    cwd = resolve(cwd, (args[0] ?? homedir()).replace(/^~/, homedir()));
  } else if (word === 'git' || word?.endsWith('/git')) {
    checkGit(args, cwd);
  } else if (word === 'gh' || word?.endsWith('/gh')) {
    checkGh(args);
  }
}
