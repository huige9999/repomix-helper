import * as vscode from "vscode";
import * as path from "path";

type Lists = { include: string[]; ignore: string[] };

const KEY = "repomixHelper.lists";

// ---- UI singletons ----
let outputChannel: vscode.OutputChannel | undefined;
let statusRunItem: vscode.StatusBarItem | undefined;
let statusClearItem: vscode.StatusBarItem | undefined;

function getOutput() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("Repomix Helper");
  }
  return outputChannel;
}

function uniqSorted(arr: string[]) {
  return Array.from(new Set(arr)).sort();
}

function toWorkspaceRelative(uri: vscode.Uri): string | null {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) return null;
  const rel = path.relative(folder.uri.fsPath, uri.fsPath);
  // VSCode/repomix 更偏好 / 分隔
  return rel.split(path.sep).join("/");
}

async function loadLists(ctx: vscode.ExtensionContext): Promise<Lists> {
  const v = ctx.workspaceState.get<Lists>(KEY);
  return v ?? { include: [], ignore: [] };
}

async function saveLists(ctx: vscode.ExtensionContext, lists: Lists) {
  await ctx.workspaceState.update(KEY, {
    include: uniqSorted(lists.include),
    ignore: uniqSorted(lists.ignore),
  });
}

async function updateStatusBar(ctx: vscode.ExtensionContext) {
  if (!statusRunItem || !statusClearItem) return;

  const lists = await loadLists(ctx);
  const i = lists.include.length;
  const x = lists.ignore.length;

  // 你可以换成更喜欢的图标：$(play) / $(rocket) / $(package)
  statusRunItem.text = `$(package) Repomix Run  I:${i}  X:${x}`;
  statusRunItem.tooltip = "运行 repomix（使用当前 include/ignore 列表）";
  statusRunItem.show();

  statusClearItem.text = `$(trash) Repomix Clear`;
  statusClearItem.tooltip = "清空 include/ignore 列表";
  statusClearItem.show();
}

/**
 * 支持：
 * - 单选右键：uri
 * - 多选右键：uris（第二参数）
 * - 命令面板触发：没有 uri/uris → 回退到当前编辑器文件
 */
async function addPaths(
  ctx: vscode.ExtensionContext,
  kind: "include" | "ignore",
  uri?: vscode.Uri,
  uris?: vscode.Uri[]
) {
  const picked: vscode.Uri[] =
    uris && uris.length > 0 ? uris : uri ? [uri] : [];

  if (picked.length === 0) {
    const ed = vscode.window.activeTextEditor;
    if (!ed) {
      vscode.window.showWarningMessage("No file selected.");
      return;
    }
    picked.push(ed.document.uri);
  }

  const lists = await loadLists(ctx);

  let added = 0;
  let skipped = 0;

  for (const u of picked) {
    const rel = toWorkspaceRelative(u);
    if (!rel) {
      skipped++;
      continue;
    }

    // 去重加入（saveLists 也会 Set+sort，但这里先算 added 更准确）
    if (!lists[kind].includes(rel)) {
      lists[kind].push(rel);
      added++;
    }
  }

  await saveLists(ctx, lists);
  await updateStatusBar(ctx);

  vscode.window.setStatusBarMessage(
    `Repomix Helper: ${kind} +${added}（跳过 ${skipped}）`,
    2500
  );
}

async function showLists(ctx: vscode.ExtensionContext) {
  const lists = await loadLists(ctx);
  const msg =
    `Include (${lists.include.length}):\n` +
    (lists.include.join("\n") || "(empty)") +
    `\n\nIgnore (${lists.ignore.length}):\n` +
    (lists.ignore.join("\n") || "(empty)");

  vscode.window.showInformationMessage("Repomix Helper 列表已输出到 Output 面板。");
  const out = getOutput();
  out.clear();
  out.appendLine(msg);
  out.show(true);
}

async function clearLists(ctx: vscode.ExtensionContext) {
  await saveLists(ctx, { include: [], ignore: [] });
  await updateStatusBar(ctx);
  vscode.window.showInformationMessage("Repomix Helper: 已清空 include/ignore 列表。");
}

async function runRepomix(ctx: vscode.ExtensionContext) {
  const lists = await loadLists(ctx);
  if (lists.include.length === 0) {
    vscode.window.showWarningMessage("Repomix Helper: include 列表为空。");
    return;
  }

  const cfg = vscode.workspace.getConfiguration("repomixHelper");
  const repomixCommand = cfg.get<string>("repomixCommand") || "repomix";

  // 逗号隔开：--include "a,b" --ignore "c,d"
  const includeArg = lists.include.join(",");
  const args: string[] = ["--include", includeArg];

  if (lists.ignore.length > 0) {
    const ignoreArg = lists.ignore.join(",");
    args.push("--ignore", ignoreArg);
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage("No workspace folder opened.");
    return;
  }

  const exec = new vscode.ShellExecution(repomixCommand, args, {
    cwd: workspaceFolder.uri.fsPath,
  });

  const task = new vscode.Task(
    { type: "repomix-helper" },
    workspaceFolder,
    "Repomix: Pack",
    "Repomix Helper",
    exec
  );

  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };

  vscode.tasks.executeTask(task);
}

export async function activate(context: vscode.ExtensionContext) {
  // ---- status bar items ----
  statusRunItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusRunItem.command = "repomixHelper.run";

  statusClearItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    99
  );
  statusClearItem.command = "repomixHelper.clear";

  context.subscriptions.push(statusRunItem, statusClearItem);

  // ---- commands ----
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "repomixHelper.addInclude",
      (uri: vscode.Uri, uris?: vscode.Uri[]) => addPaths(context, "include", uri, uris)
    ),
    vscode.commands.registerCommand(
      "repomixHelper.addIgnore",
      (uri: vscode.Uri, uris?: vscode.Uri[]) => addPaths(context, "ignore", uri, uris)
    ),
    vscode.commands.registerCommand("repomixHelper.run", () => runRepomix(context)),
    vscode.commands.registerCommand("repomixHelper.show", () => showLists(context)),
    vscode.commands.registerCommand("repomixHelper.clear", () => clearLists(context))
  );

  await updateStatusBar(context);
}

export function deactivate() {
  outputChannel?.dispose();
  statusRunItem?.dispose();
  statusClearItem?.dispose();
}
