import z from "zod";
import { Manager } from ".";
import { Context, createCommand } from "@paowa-bot/core";
import { cacheFile } from "@paowa-bot/core";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "fs/promises";
import React from "react";
import path from "path";
import { CommandList } from "./command-list";
import { mkdirSync } from "fs";
function checkCommand(m: Manager, ctx: Context, pluginName: string, cmdName: string) {
    if (!m.bot.plugins.has(pluginName)) {
        ctx.reply.text(`没找到插件: ${pluginName}`).commit();
        return;
    }
    const cmd = cmdName.trim();
    if (cmd.indexOf(" ") >= 0) {
        ctx.reply.text(`命令名不能包含空格`).commit();
        return;
    }
    const plugin = m.bot.plugins.get(pluginName)!;
    for (const command of plugin.commands || []) {
        if (command.basename === cmd) {
            return command;
        }
    }
    ctx.reply.text(`没找到命令: ${cmd}`).commit();
}
export default function command(m: Manager) {
    return [
        createCommand({
            name: "command list",
            description: "List all commands",
            handler: async (ctx) => {
                let fontPath = cacheFile("MiSans-Regular.ttf");
                if (m.config.fontPath) {
                    fontPath = m.config.fontPath;
                } else {
                    const fontUrl =
                        "https://gh-proxy.org/https://github.com/dsrkafuu/misans/raw/refs/heads/main/raw/Normal/ttf/MiSans-Regular.ttf";
                    const res = await fetch(fontUrl);
                    const buffer = await res.bytes();
                    mkdirSync(path.dirname(fontPath), { recursive: true, mode: 0o755 });
                    await writeFile(fontPath, buffer, { mode: 0o644 });
                }

                const commands = Array.from(m.bot.plugins.values()).flatMap(
                    (p) => p.commands || []
                );

                const fontData = await readFile(fontPath);
                const element = React.createElement(CommandList, { commands });

                const svg = await satori(element, {
                    width: 600,
                    fonts: [
                        {
                            name: "Roboto Slab",
                            data: fontData,
                            weight: 400,
                            style: "normal",
                        },
                    ],
                });

                const resvg = new Resvg(svg);
                const pngData = resvg.render();
                const pngBuffer = pngData.asPng();

                const base64 = pngBuffer.toString("base64");

                await ctx.reply.image(`base64://${base64}`).commit();
            },
        }),
        createCommand({
            name: "command disable <plugin> <command>",
            description: "Disable a command in current group",
            scope: "group",
            permission: "admin",
            args: [z.string(), z.string()],
            handler: async (ctx, args) => {
                const [pluginName, cmdName] = args;
                const command = checkCommand(m, ctx, pluginName, cmdName);
                if (!command) return;
                m.bot.permission.disableGroupCommand(ctx.group_id, pluginName, command.basename);
                ctx.reply.text(`已在当前群禁用命令: ${command.basename}`).commit();
            },
        }),
        createCommand({
            name: "command enable <plugin> <command>",
            description: "Enable a command in current group",
            scope: "group",
            permission: "admin",
            args: [z.string(), z.string()],
            handler: async (ctx, args) => {
                const [pluginName, cmdName] = args;
                m.bot.permission.enableGroupCommand(ctx.group_id, pluginName, cmdName);
                ctx.reply.text(`已在当前群启用命令: ${command}`).commit();
            },
        }),
    ];
}
