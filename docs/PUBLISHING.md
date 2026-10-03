# 发布到 GitHub

## 资料包与远程仓库的区别

此资料包包含五个 idea 的目录、文档和建库辅助脚本。生成或下载资料包，并不代表 GitHub 仓库已经创建。

本次对话已通过连接读取确认 GitHub 账号为 `jggagi`。对话可用的 GitHub 操作没有创建仓库和推送文件的入口，执行环境也没有可用的 GitHub CLI。因此本次只交付资料包；真正的创建与推送要在已授权的本机环境执行。

发布脚本只有在实际读取确认 private 可见性、默认分支 main、远程 main 的提交 SHA 与本地一致后，才输出“验证通过”。

## 前置条件

本机安装 Git 与 GitHub CLI（命令 `gh`）。在 Mac mini、MacBook、Linux 或具备相应工具的终端运行均可；不需要在这个仓库安装游戏引擎或其他运行时。

GitHub CLI 安装方式参考其官方安装文档。需要登录时，在自己的终端执行：

```bash
gh auth login --hostname github.com
```

登录账号应当是 `jggagi`。不要把 token、密码或 SSH 私钥粘贴到聊天或放进仓库。

Git 应已有自己的提交署名和邮箱；脚本缺失时会停止，并提示在当前目录配置。可以使用 GitHub 账号设置页提供的隐私提交邮箱；脚本不会替你猜测邮箱，也不会修改全局 Git 配置。

## 发布新仓库

将 `human-after-ai.zip` 解压到一个独立目录，不要解压到别的 Git 工作区里面。在解压得到的目录执行：

```bash
cd human-after-ai
bash scripts/publish-github.sh
```

默认目标是 `jggagi/human-after-ai`，可见性为 **private**，本地初始分支为 `main`。文件包不带 `.git`，初始提交在你的机器上使用你的 Git 身份创建。

可在首次发布时传入另一个仓库名：

```bash
bash scripts/publish-github.sh another-repository-name
```

这只改变 GitHub 仓库名，不自动改写文档中的工作名。账号仍限制为 `jggagi`。

## 脚本不会做的事

不会覆盖已有同名远程仓库；不会继承父目录的 Git 工作区；不会更改已有远程地址；不会对已有本地提交历史再次初始化；不会强推、删除内容、添加许可证或公开仓库；不会创建 Issues、设置自动化任务或安装其他工具。

脚本只暂存资料包约定的路径。发布前请检查这些目录中没有自行添加的敏感内容。Git 的提交署名和邮箱会成为提交元数据。

## 部分失败后如何恢复

创建和推送是网络操作，可能出现“本地已有提交”“远程已创建但没有推送完成”等中间状态。**不要把失败提示解读成远程一定不存在，也不要通过强推或删库重试。**

先检查：

```bash
git status
git log -1 --oneline
git remote -v
gh repo view jggagi/human-after-ai --json nameWithOwner,isPrivate,defaultBranchRef,url
```

如果本地已有正确的初始提交、远程尚不存在、并且没有配置 origin，确认后可以执行原始创建命令：

```bash
gh repo create jggagi/human-after-ai --private --source=. --remote=origin --push
```

如果远程已创建为 private、origin 指向这个仓库，而且确认是本次创建的空仓库，可执行普通推送：

```bash
git push -u origin main
```

如果提示远程已有不同历史，停止并比较差异，不使用 `--force`。已存在但 origin 未配置、权限不足或认证失败时，应先检查具体状态，不用脚本猜测或接管。

核验本地与远程提交：

```bash
git rev-parse HEAD
gh api --hostname github.com repos/jggagi/human-after-ai/git/ref/heads/main --jq .object.sha
gh repo view jggagi/human-after-ai --json isPrivate,defaultBranchRef,url
```

两个 SHA 应相同，`isPrivate` 应为 true，默认分支应为 main。若自定义了仓库名，上述恢复命令也必须相应替换。

## 参考文档

以下为发布脚本所用命令的官方文档，核对日期：2026-10-03。

- GitHub CLI `gh repo create`：https://cli.github.com/manual/gh_repo_create
- GitHub CLI `gh repo view`：https://cli.github.com/manual/gh_repo_view
- GitHub CLI 安装：https://github.com/cli/cli#installation

## 本次交付的验证范围

文档结构、相对链接、脚本语法及发布逻辑可以在隔离环境校验。模拟测试不是远程创建或真实推送测试；本次没有在 GitHub 上执行创建或推送。
