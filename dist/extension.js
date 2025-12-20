"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var path = __toESM(require("path"));
var KEY = "repomixHelper.lists";
var outputChannel;
var statusRunItem;
var statusClearItem;
function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort();
}
function toWorkspaceRelative(uri) {
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) return null;
  const rel = path.relative(folder.uri.fsPath, uri.fsPath);
  return rel.split(path.sep).join("/");
}
async function loadLists(ctx) {
  const v = ctx.workspaceState.get(KEY);
  return v ?? { include: [], ignore: [] };
}
async function saveLists(ctx, lists) {
  await ctx.workspaceState.update(KEY, {
    include: uniqSorted(lists.include),
    ignore: uniqSorted(lists.ignore)
  });
}
async function updateStatusBar(ctx) {
  if (!statusRunItem || !statusClearItem) return;
  const lists = await loadLists(ctx);
  const i = lists.include.length;
  const x = lists.ignore.length;
  statusRunItem.text = `$(package) Repomix Run  I:${i}  X:${x}`;
  statusRunItem.tooltip = "\u8FD0\u884C repomix\uFF08\u4F7F\u7528\u5F53\u524D include/ignore \u5217\u8868\uFF09";
  statusRunItem.show();
  statusClearItem.text = `$(trash) Repomix Clear`;
  statusClearItem.tooltip = "\u6E05\u7A7A include/ignore \u5217\u8868";
  statusClearItem.show();
}
async function addPaths(ctx, kind, uri, uris) {
  const picked = uris && uris.length > 0 ? uris : uri ? [uri] : [];
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
    if (!lists[kind].includes(rel)) {
      lists[kind].push(rel);
      added++;
    }
  }
  await saveLists(ctx, lists);
  await updateStatusBar(ctx);
  vscode.window.setStatusBarMessage(
    `Repomix Helper: ${kind} +${added}\uFF08\u8DF3\u8FC7 ${skipped}\uFF09`,
    2500
  );
}
async function clearLists(ctx) {
  await saveLists(ctx, { include: [], ignore: [] });
  await updateStatusBar(ctx);
  vscode.window.showInformationMessage("Repomix Helper: \u5DF2\u6E05\u7A7A include/ignore \u5217\u8868\u3002");
}
async function runRepomix(ctx) {
  const lists = await loadLists(ctx);
  if (lists.include.length === 0) {
    vscode.window.showWarningMessage("Repomix Helper: include \u5217\u8868\u4E3A\u7A7A\u3002");
    return;
  }
  const cfg = vscode.workspace.getConfiguration("repomixHelper");
  const repomixCommand = cfg.get("repomixCommand") || "repomix";
  const includeArg = lists.include.join(",");
  const args = ["--include", includeArg];
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
    cwd: workspaceFolder.uri.fsPath
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
    clear: true
  };
  vscode.tasks.executeTask(task);
}
async function exportRepomixCommand(ctx) {
  const lists = await loadLists(ctx);
  const cfg = vscode.workspace.getConfiguration("repomixHelper");
  const repomixCommand = cfg.get("repomixCommand") || "repomix";
  const includeArg = lists.include.join(",");
  const ignoreArg = lists.ignore.join(",");
  const parts = [repomixCommand];
  if (includeArg) {
    parts.push(`--include "${includeArg}"`);
  }
  if (ignoreArg) {
    parts.push(`--ignore "${ignoreArg}"`);
  }
  const cmd = parts.join(" ");
  const out = vscode.window.createOutputChannel("Repomix Helper");
  out.show(true);
  out.appendLine("=== Repomix Export ===");
  out.appendLine(cmd);
  out.appendLine("");
  out.appendLine(`Include: ${lists.include.length}, Ignore: ${lists.ignore.length}`);
  out.appendLine("======================");
  if (!includeArg) {
    vscode.window.showWarningMessage("Repomix Helper: include \u5217\u8868\u4E3A\u7A7A\uFF0C\u5BFC\u51FA\u7684\u547D\u4EE4\u53EF\u80FD\u65E0\u6CD5\u6253\u5305\u4F60\u671F\u671B\u7684\u5185\u5BB9\u3002");
  } else {
    vscode.window.showInformationMessage("Repomix Helper: \u5DF2\u5BFC\u51FA\u547D\u4EE4\u5230 Output\uFF08Repomix Helper\uFF09\u3002");
  }
}
async function activate(context) {
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
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "repomixHelper.addInclude",
      (uri, uris) => addPaths(context, "include", uri, uris)
    ),
    vscode.commands.registerCommand(
      "repomixHelper.addIgnore",
      (uri, uris) => addPaths(context, "ignore", uri, uris)
    ),
    vscode.commands.registerCommand("repomixHelper.run", () => runRepomix(context)),
    vscode.commands.registerCommand("repomixHelper.clear", () => clearLists(context)),
    vscode.commands.registerCommand(
      "repomixHelper.export",
      () => exportRepomixCommand(context)
    )
  );
  await updateStatusBar(context);
}
function deactivate() {
  outputChannel?.dispose();
  statusRunItem?.dispose();
  statusClearItem?.dispose();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
