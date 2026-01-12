import z from "zod";
import { Bot, Context, createCommand, cacheFile } from "@paowa-bot/core";
import { PermissionPlugin } from "../index";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "fs/promises";
import React from "react";
import path from "path";
import { CommandList } from "../components/command-list";
import { mkdirSync } from "fs";

function checkCommand(bot: Bot, ctx: Context, pluginName: string, cmdName: string) {
    if (!bot.plugins.has(pluginName)) {
        ctx.reply.text(`没找到插件: ${pluginName}`).commit();
        return;
    }
    const cmd = cmdName.trim();
    if (cmd.indexOf(" ") >= 0) {
        ctx.reply.text(`命令名不能包含空格`).commit();
        return;
    }
    const plugin = bot.plugins.get(pluginName)!;
    for (const command of plugin.commands || []) {
        if (command.basename === cmd) {
            return command;
        }
    }
    ctx.reply.text(`没找到命令: ${cmd}`).commit();
}

export default function command(p: PermissionPlugin) {
    return [
        createCommand({
            name: "command list",
            description: "List all commands",
            handler: async (ctx) => {
                let fontPath = cacheFile("MiSans-Regular.ttf");
                if (p.config.fontPath) {
                    fontPath = p.config.fontPath;
                } else {
                    const fontUrl =
                        "https://gh-proxy.org/https://github.com/dsrkafuu/misans/raw/refs/heads/main/raw/Normal/ttf/MiSans-Regular.ttf";
                    const res = await fetch(fontUrl);
                    const buffer = await res.bytes();
                    mkdirSync(path.dirname(fontPath), { recursive: true, mode: 0o755 });
                    await writeFile(fontPath, buffer, { mode: 0o644 });
                }

                const commands = Array.from(p.bot.plugins.values()).flatMap(
                    (pl) => pl.commands || []
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
            description: "Disable a command in current context",
            scope: "all",
            permission: "admin",
            args: [z.string(), z.string()],
            handler: async (ctx, args) => {
                const [pluginName, cmdName] = args;
                const cmd = checkCommand(p.bot, ctx, pluginName, cmdName);
                if (!cmd) return;

                const type = ctx.is_group ? "group" : "user";
                const targetId = ctx.is_group ? ctx.group_id : ctx.sender_id;

                p.manager.disableTarget(targetId, type, pluginName, cmd.basename);
                ctx.reply.text(`已为 ${type} ${targetId} 禁用命令: ${cmd.basename}`).commit();
            },
        }),
        createCommand({
            name: "command disable <type> <id> <plugin> <command>",
            description: "Disable a command for a specific user/group",
            scope: "all",
            permission: "admin",
            args: [z.enum(["user", "group"]), z.coerce.number(), z.string(), z.string()],
            handler: async (ctx, args) => {
                const [type, id, pluginName, cmdName] = args;
                const cmd = checkCommand(p.bot, ctx, pluginName, cmdName);
                if (!cmd) return;

                p.manager.disableTarget(id, type, pluginName, cmd.basename);
                ctx.reply.text(`已为 ${type} ${id} 禁用命令: ${cmd.basename}`).commit();
            },
        }),
        createCommand({
            name: "command enable <plugin> <command>",
            description: "Enable a command in current context",
            scope: "all",
            permission: "admin",
            args: [z.string(), z.string()],
            handler: async (ctx, args) => {
                const [pluginName, cmdName] = args;
                const type = ctx.is_group ? "group" : "user";
                const targetId = ctx.is_group ? ctx.group_id : ctx.sender_id;

                p.manager.enableTarget(targetId, type, pluginName, cmdName);
                ctx.reply.text(`已为 ${type} ${targetId} 启用命令: ${cmdName}`).commit();
            },
        }),
        createCommand({
            name: "command enable <type> <id> <plugin> <command>",
            description: "Enable a command for a specific user/group",
            scope: "all",
            permission: "admin",
            args: [z.enum(["user", "group"]), z.coerce.number(), z.string(), z.string()],
            handler: async (ctx, args) => {
                const [type, id, pluginName, cmdName] = args;
                p.manager.enableTarget(id, type, pluginName, cmdName);
                ctx.reply.text(`已为 ${type} ${id} 启用命令: ${cmdName}`).commit();
            },
        }),
    ];
}
