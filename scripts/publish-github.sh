#!/usr/bin/env bash
# Create a NEW private repository and push this starter, using your own Git identity.
# Requires: Bash, Git, and an authenticated GitHub CLI. No token is accepted or stored.
set -euo pipefail

fail() { printf '\n错误：%s\n' "$*" >&2; exit 1; }

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  printf '用法：bash scripts/publish-github.sh [仓库名]\n'
  printf '默认：jggagi/human-after-ai，private。只初始化新仓库，不覆盖已有历史。\n'
  exit 0
fi
[[ "$#" -le 1 ]] || fail '最多传入一个仓库名；查看 --help。'

OWNER='jggagi'
NAME="${1:-human-after-ai}"
[[ "$NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || fail '仓库名只能包含字母、数字、点、下划线和连字符，并以字母或数字开头。'
TARGET="$OWNER/$NAME"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
export GH_HOST=github.com

for executable in git gh; do
  command -v "$executable" >/dev/null 2>&1 || fail "未找到 $executable。请先安装；参见 docs/PUBLISHING.md。"
done
[[ -z "${GIT_DIR:-}" && -z "${GIT_WORK_TREE:-}" && -z "${GIT_INDEX_FILE:-}" ]] || fail '请在未设置 GIT_DIR、GIT_WORK_TREE 或 GIT_INDEX_FILE 的普通终端运行。'
[[ -f "$ROOT/README.md" && -f "$ROOT/AGENTS.md" && -f "$ROOT/ideas/01-tomorrow-i-will-come/SEED.md" && -f "$ROOT/ideas/05-city-without-use/SEED.md" ]] || fail '资料包不完整，无法确认发布目录。'
cd "$ROOT"

gh auth status --hostname github.com >/dev/null 2>&1 || fail 'GitHub CLI 未通过登录检查。请先运行：gh auth login --hostname github.com'
LOGIN="$(gh api --hostname github.com user --jq .login)" || fail '无法读取 GitHub 登录账号。'
[[ "$LOGIN" == "$OWNER" ]] || fail "当前账号是 $LOGIN，预期是 $OWNER；未创建仓库，也未提交文件。请切换 GitHub CLI 账号后再试。"

# A failed lookup is not assumed to prove absence: the later create call must succeed.
# An existing repository is never adopted or overwritten by this bootstrap script.
if gh repo view "$TARGET" --json nameWithOwner >/dev/null 2>&1; then
  fail "$TARGET 已存在。脚本不会向已有仓库写入；请检查现有仓库或指定新的仓库名。"
fi

if TOP="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  TOP="$(cd "$TOP" && pwd -P)"
  [[ "$TOP" == "$ROOT" ]] || fail '当前目录位于另一个 Git 仓库内部。请把资料包移到独立目录再运行。'
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    fail '本地已经有提交历史。为避免重复提交或误推送，本脚本停止；恢复发布请参见 docs/PUBLISHING.md。'
  fi
  [[ -z "$(git remote)" ]] || fail '本地已配置远程仓库；脚本不会改写远程地址。'
else
  [[ ! -e .git ]] || fail '发现无法识别的 .git，未修改它。'
  git init --initial-branch=main
fi

# Require a deliberate Git identity; never manufacture a user email or alter global config.
[[ -n "$(git config user.name || true)" ]] || fail '未配置 Git user.name。请在当前目录运行 git config user.name "你的提交署名" 后重试。'
[[ -n "$(git config user.email || true)" ]] || fail '未配置 Git user.email。请在当前目录设置自己的提交邮箱（可使用 GitHub 设置页给出的隐私邮箱）后重试。'
[[ "$(git symbolic-ref --short HEAD)" == 'main' ]] || fail '初始分支不是 main。请在独立的全新目录运行，脚本不会重命名已有分支。'
[[ -z "$(git ls-files --stage)" ]] || fail '暂存区已有文件；为避免夹带其他内容，脚本停止。'

# Only known starter paths are staged. No global git settings, force-push or deletes.
git add -- README.md AGENTS.md VISION.md ROADMAP.md .gitignore .gitattributes \
  docs ideas templates scripts .github
git diff --cached --quiet && fail '没有可以创建初始提交的内容。'
git commit -m 'docs: seed five narrative game concepts'

printf '\n正在创建 %s（private）并推送初始提交……\n' "$TARGET"
if ! gh repo create "$TARGET" --private --description \
  'Narrative game concepts exploring human value in the age of AI.' \
  --source "$ROOT" --remote origin --push; then
  printf '\n创建／推送未完整成功。GitHub 上可能已经创建空仓库；本地提交已保留。\n' >&2
  printf '请检查 gh repo view %s，并按 docs/PUBLISHING.md 恢复；不要强推。\n' "$TARGET" >&2
  exit 1
fi

PRIVATE="$(gh repo view "$TARGET" --json isPrivate --jq .isPrivate)" || fail '创建命令已完成，但无法验证可见性；请在 GitHub 检查。'
[[ "$PRIVATE" == true ]] || fail '远程可见性校验不是 private。请立即检查 GitHub 设置；未宣告发布完成。'
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(gh api --hostname github.com "repos/$TARGET/git/ref/heads/main" --jq .object.sha)" || fail '无法验证远程 main 分支；请检查推送结果。'
[[ "$LOCAL_SHA" == "$REMOTE_SHA" ]] || fail '远程 main 与本地初始提交不一致，未宣告发布完成。'
DEFAULT_BRANCH="$(gh repo view "$TARGET" --json defaultBranchRef --jq .defaultBranchRef.name)" || fail '无法验证默认分支；请在 GitHub 检查。'
[[ "$DEFAULT_BRANCH" == main ]] || fail 'main 已推送，但尚未成为默认分支；请在 GitHub 将默认分支设为 main。'
URL="$(gh repo view "$TARGET" --json url --jq .url)" || fail '提交已验证，但无法读取仓库 URL；请在 GitHub 查看。'

printf '\n验证通过：%s\n可见性：private\n分支：main\n提交：%s\n' "$URL" "$LOCAL_SHA"
printf '五个 idea 已进入同一个 GitHub 仓库；下一步可以在对应文件夹继续打磨。\n'
