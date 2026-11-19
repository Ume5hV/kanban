---
description: Publish this project to a GitHub repo (code, README, About, Pages, CI/CD, secrets check)
argument-hint: <github repo URL or owner/repo> [branch, default main]
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

Publish the current project to the GitHub repo given in: $ARGUMENTS

Parse the first word as the repo (`https://github.com/<owner>/<repo>`, `.git` URL or `owner/repo`) and the optional second word as the branch (default `main`). If no repo was given, ask for it and stop.

Work through the steps in order. Stop and report at the first failure; never skip the secrets check, and never force-push, rewrite remote history or delete anything on the remote without the user's explicit yes in chat.

## 0. Preflight
- Run `git --version` and `gh --version`. If `gh` is missing, tell the user to install it (`brew install gh`) and sign in with `gh auth login` themselves. Do not ask for or type tokens or passwords. Steps 4 to 6 need `gh`; do steps 1 to 3 with plain git if `gh` is unavailable and list the rest as not done.
- Confirm the target repo exists and is reachable (`git ls-remote <url>` or `gh repo view`). If it does not exist, ask before creating it, and ask whether it should be public or private.
- If it already has branches or commits, look at them (`git ls-remote --heads`, `git ls-tree -r --name-only`). If the remote content is unrelated to this project, tell the user and ask before pushing.
- Make sure `git config user.name` and `user.email` are set; if not, ask the user for them. Do not guess.

## 1. Check for sensitive data (must pass before anything is pushed)
Scan every file that would be uploaded (tracked, staged and untracked, minus `.gitignore`d files), and also the git history that would be pushed (`git log -p`):
- Files that should not ship: `.env*`, `*.pem`, `*.key`, `*.p12`, `id_rsa*`, `*.keystore`, credential or service-account JSON, `.npmrc`/`.pypirc` with tokens, `*.sqlite`/dumps, `.DS_Store`, `node_modules`, `.claude/settings.local.json`.
- Content patterns: private key headers, `AKIA[0-9A-Z]{16}`, `ghp_`/`github_pat_`/`gho_` tokens, `sk-` style API keys, `xox[baprs]-` Slack tokens, `Authorization: Bearer`, `password`/`secret`/`token`/`api_key` assigned to a literal value, connection strings with embedded credentials, and personal data such as real email addresses, phone numbers or internal hostnames.
- Placeholder values (for example `YOUR_EMAIL@example.com`) are fine; a real address in a public client-side file is not.
- If anything is found: do not push. List each finding as file, line and kind, without printing the secret value, and propose a fix (remove it, move it to an ignored file or a GitHub Actions secret, add it to `.gitignore`). If a secret already appears in history, say it must be rotated and the history cleaned, and wait for the user.
- Create or extend `.gitignore` (`.DS_Store`, `.env*`, `node_modules/`, editor and OS files) so these stay out.

## 2. Upload the code
- If this folder is not a git repo, run `git init -b <branch>`. Otherwise keep the existing history.
- Set `origin` to the target repo (`git remote add` or `set-url`).
- Stage only the files you reviewed in step 1 by name or directory, not a blind `git add -A`, then check `git status` and `git diff --cached --stat` to confirm no unexpected files (for example a subfolder from another project) are included. Commit with a clear message.
- Push with `git push -u origin <branch>`. If the push is rejected because the remote has other work, fetch and rebase or merge, show the user what came in, and push again. Do not use `--force`.

## 3. README
- Create `README.md`, or edit the existing one in place, keeping anything the user wrote.
- Cover: what the project is, a feature list, how to run it, the project's configuration (for example the one setting to change), known limits, the live Pages link (added in step 5) and the licence if one exists.
- Base it on the actual code and `CLAUDE.md`. Do not invent features, badges or commands.

## 3b. Screenshot with Playwright MCP (README evidence)
- Needs the project's `playwright` MCP server (`.mcp.json`) and Google Chrome. If its `browser_*` tools are not available, or Chrome is missing (`npx playwright install chrome`), say so and ask the user before falling back to another browser (for example headless Brave: `--headless=new --window-size=1440,900 --screenshot=docs/screenshot.png <url>`). If tools are not available, tell the user to restart Claude Code in this folder and approve the server, and list this step as not done. Do not substitute another browser tool without asking.
- Use the live Pages URL if the site is already deployed. On a first publish, serve the folder locally (`python3 -m http.server 8765`) and use http://localhost:8765/, then take the live screenshot again after step 5.
- With Playwright MCP: `browser_navigate` to the URL, `browser_resize` to about 1440x900, wait for the page to render, then `browser_take_screenshot` (full page when the page is short; otherwise the main view) and save it as `docs/screenshot.png`. Look at it to confirm the page rendered and that no sensitive data is visible.
- If the user named a Word or other document to paste the screenshot into, insert it there as well, at the place they named, and never upload that document to GitHub unless asked (assessment and personal documents often hold IDs). Add it to `.gitignore` if it sits in the project folder.
- Embed it in `README.md` under a "Screenshot" heading with alt text, for example `![IT PMO Kanban board](docs/screenshot.png)`. Commit `docs/screenshot.png` with the README.

## 4. Repo About section
- Set the description and topics with `gh repo edit <owner>/<repo> --description "<one line>" --add-topic <topic>`.
- Leave the homepage blank until step 5 gives the Pages URL.

## 5. GitHub Pages
- Work out what to serve. For a static site with `index.html` at the root, serve branch `<branch>` from `/`; if there is a build step, deploy with the workflow from step 6 instead.
- Enable Pages: `gh api -X POST repos/<owner>/<repo>/pages -f "source[branch]=<branch>" -f "source[path]=/"`. If Pages is already enabled, use `-X PUT` to update it. If the API refuses (for example a private repo on a plan without Pages), report that and stop this step.
- Read back the URL with `gh api repos/<owner>/<repo>/pages --jq .html_url`.
- Set it as the About homepage: `gh repo edit <owner>/<repo> --homepage "<pages url>"`, and add the link to the README. Commit and push that README change.
- Note that the first deploy can take a minute or two.

## 6. CI/CD with GitHub Actions
- Add `.github/workflows/ci.yml` that runs on `push` and `pull_request` to `<branch>`, with least-privilege `permissions`, and actions pinned to a major version.
- Make the checks fit the project. For a plain static site: validate the HTML (for example `npx --yes html-validate`), and run a secret scan (for example gitleaks) so keys can't land in future commits. Add test or lint jobs only if the project has them.
- If you want deploys from Actions rather than branch deploy, add `.github/workflows/pages.yml` using `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`, with `pages: write` and `id-token: write`, and set the Pages source to "GitHub Actions" (`-f build_type=workflow`) in step 5. Use one method, not both.
- Never put secrets in workflow files; reference them as `${{ secrets.NAME }}` and tell the user which ones to create in Settings.
- Commit and push, then check the first run with `gh run list --limit 3` and `gh run watch`, and report pass or fail.

## 7. Final check and report
- Re-run the step 1 scan on the pushed branch (`git ls-tree -r --name-only origin/<branch>`) to confirm nothing sensitive reached the remote.
- Report in a short list: repo URL, branch, commit, Pages URL, CI status, the About text, anything skipped or failed, and anything the user must do themselves (sign-in, secrets, enabling Pages in Settings).
