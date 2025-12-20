import * as vscode from "vscode";
import * as path from "path";

type Lists = { include: string[]; ignore: string[] };

const KEY = "repomixHelper.lists";

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

async function addPath(
  ctx: vscode.ExtensionContext,
  kind: "include" | "ignore",
  uri?: vscode.Uri
) {
  if (!uri) {
    const ed = vscode.window.activeTextEditor;
    if (!ed) {
      vscode.window.showWarningMessage("No file selected.");
      return;
    }
    uri = ed.document.uri;
  }

  const rel = toWorkspaceRelative(uri);
  if (!rel) {
    vscode.window.showWarningMessage("File is not inside an opened workspace folder.");
    return;
  }

  const lists = await loadLists(ctx);
  lists[kind].push(rel);
  await saveLists(ctx, lists);

  vscode.window.setStatusBarMessage(
    `Repomix Helper: added to ${kind}: ${rel}`,
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
  vscode.window.showInformationMessage("Repomix Helper lists shown in Output.");
  const out = vscode.window.createOutputChannel("Repomix Helper");
  out.clear();
  out.appendLine(msg);
  out.show(true);
}

async function clearLists(ctx: vscode.ExtensionContext) {
  await saveLists(ctx, { include: [], ignore: [] });
  vscode.window.showInformationMessage("Repomix Helper: cleared include/ignore lists.");
}

async function runRepomix(ctx: vscode.ExtensionContext) {
  const lists = await loadLists(ctx);
  if (lists.include.length === 0) {
    vscode.window.showWarningMessage("Repomix Helper: include list is empty.");
    return;
  }

  const cfg = vscode.workspace.getConfiguration("repomixHelper");
  const repomixCommand = cfg.get<string>("repomixCommand") || "repomix";

  // 你现在的习惯是逗号隔开：--include "a,b" --ignore "c,d"
  const includeArg = lists.include.join(",");
  const args: string[] = ["--include", includeArg];

  if (lists.ignore.length > 0) {
    const ignoreArg = lists.ignore.join(",");
    args.push("--ignore", ignoreArg);
  }

  // 用 VS Code Task 执行，比自己拼 shell 字符串更少引号地狱
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

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("repomixHelper.addInclude", (uri: vscode.Uri) =>
      addPath(context, "include", uri)
    ),
    vscode.commands.registerCommand("repomixHelper.addIgnore", (uri: vscode.Uri) =>
      addPath(context, "ignore", uri)
    ),
    vscode.commands.registerCommand("repomixHelper.run", () => runRepomix(context)),
    vscode.commands.registerCommand("repomixHelper.show", () => showLists(context)),
    vscode.commands.registerCommand("repomixHelper.clear", () => clearLists(context))
  );
}

export function deactivate() {}
