import {
    definePlugin,
    Bot,
    PluginSpec,
    createCommand,
    Logger,
    withScope,
    dataFile,
} from "@paowa-bot/core";
import { z } from "zod";
import * as git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import * as fs from "fs";
import * as path from "path";

interface PMState {
    plugins: Record<
        string,
        {
            repo: string;
            installedAt: string;
            lastUpdated?: string;
        }
    >;
}

export class PluginManager implements PluginSpec {
    private logger: Logger;
    private pluginDir: string = "";
    private stateFile: string;
    private state: PMState = { plugins: {} };

    meta = {
        name: "plugin-manager",
        version: "1.2.0",
        description: "GitHub 插件管理器",
    };

    constructor() {
        this.logger = withScope("PluginManager");
        this.stateFile = dataFile("pm.json");
        this.loadState();
    }

    private loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                this.state = JSON.parse(fs.readFileSync(this.stateFile, "utf-8"));
            }
        } catch (err) {
            this.logger.error("Failed to load PM state:", err);
        }
    }

    private saveState() {
        try {
            const dir = path.dirname(this.stateFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
        } catch (err) {
            this.logger.error("Failed to save PM state:", err);
        }
    }

    onLoad = (bot: Bot) => {
        this.pluginDir = bot.pluginsDir;
    };

    commands = [
        createCommand({
            name: "pm install <repo>",
            description: "从 GitHub 安装插件 (e.g., user/repo)",
            scope: "all",
            args: z.string(),
            permission: "admin",
            handler: async (ctx, repo) => {
                const url = repo.startsWith("http") ? repo : `https://github.com/${repo}.git`;
                const repoName = repo.split("/").pop()?.replace(".git", "") || "unknown";
                const dir = path.join(this.pluginDir, repoName);

                if (fs.existsSync(dir)) {
                    return ctx.reply.text(`插件目录 ${repoName} 已存在`).commit();
                }

                ctx.reply.text(`正在从 ${url} 安装...`).commit();

                try {
                    await git.clone({
                        fs,
                        http,
                        dir,
                        url,
                        singleBranch: true,
                        depth: 1,
                    });

                    this.state.plugins[repoName] = {
                        repo: url,
                        installedAt: new Date().toISOString(),
                    };
                    this.saveState();

                    ctx.reply.text(`插件 ${repoName} 安装成功`).commit();
                } catch (err: any) {
                    this.logger.error(`Failed to install plugin ${repo}:`, err);
                    ctx.reply.text(`安装失败: ${err.message}`).commit();
                }
            },
        }),
        createCommand({
            name: "pm update <name>",
            description: "更新已安装的插件",
            scope: "all",
            args: z.string(),
            permission: "admin",
            handler: async (ctx, name) => {
                const dir = path.join(this.pluginDir, name);

                if (!fs.existsSync(dir)) {
                    return ctx.reply.text(`插件 ${name} 未找到`).commit();
                }

                if (!fs.existsSync(path.join(dir, ".git"))) {
                    return ctx.reply.text(`插件 ${name} 不是一个 git 仓库`).commit();
                }

                ctx.reply.text(`正在更新 ${name} ...`).commit();

                try {
                    await git.pull({
                        fs,
                        http,
                        dir,
                        fastForwardOnly: true,
                        author: {
                            name: "Paowa Bot",
                            email: "bot@paowa.bot",
                        },
                    });

                    if (this.state.plugins[name]) {
                        this.state.plugins[name].lastUpdated = new Date().toISOString();
                        this.saveState();
                    }

                    ctx.reply.text(`插件 ${name} 更新成功`).commit();
                } catch (err: any) {
                    this.logger.error(`Failed to update plugin ${name}:`, err);
                    ctx.reply.text(`更新失败: ${err.message}`).commit();
                }
            },
        }),
        createCommand({
            name: "pm list",
            description: "列出通过 PM 安装的插件",
            scope: "all",
            permission: "admin",
            handler: async (ctx) => {
                const pluginNames = Object.keys(this.state.plugins);
                if (pluginNames.length === 0) {
                    return ctx.reply.text("目前没有通过 PM 安装的插件").commit();
                }

                let list = "已安装插件列表:\n";
                for (const name of pluginNames) {
                    const info = this.state.plugins[name];
                    list += `- ${name} (${info.repo})\n  安装于: ${new Date(
                        info.installedAt
                    ).toLocaleString()}\n`;
                    if (info.lastUpdated) {
                        list += `  最后更新: ${new Date(info.lastUpdated).toLocaleString()}\n`;
                    }
                }
                ctx.reply.text(list.trim()).commit();
            },
        }),
    ];
}

export default definePlugin(new PluginManager());
