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
async function addPath(ctx, kind, uri) {
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
async function showLists(ctx) {
  const lists = await loadLists(ctx);
  const msg = `Include (${lists.include.length}):
` + (lists.include.join("\n") || "(empty)") + `

Ignore (${lists.ignore.length}):
` + (lists.ignore.join("\n") || "(empty)");
  vscode.window.showInformationMessage("Repomix Helper lists shown in Output.");
  const out = vscode.window.createOutputChannel("Repomix Helper");
  out.clear();
  out.appendLine(msg);
  out.show(true);
}
async function clearLists(ctx) {
  await saveLists(ctx, { include: [], ignore: [] });
  vscode.window.showInformationMessage("Repomix Helper: cleared include/ignore lists.");
}
async function runRepomix(ctx) {
  const lists = await loadLists(ctx);
  if (lists.include.length === 0) {
    vscode.window.showWarningMessage("Repomix Helper: include list is empty.");
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
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "repomixHelper.addInclude",
      (uri) => addPath(context, "include", uri)
    ),
    vscode.commands.registerCommand(
      "repomixHelper.addIgnore",
      (uri) => addPath(context, "ignore", uri)
    ),
    vscode.commands.registerCommand("repomixHelper.run", () => runRepomix(context)),
    vscode.commands.registerCommand("repomixHelper.show", () => showLists(context)),
    vscode.commands.registerCommand("repomixHelper.clear", () => clearLists(context))
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
