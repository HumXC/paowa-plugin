import { createCommand, cacheFile } from "@paowa-bot/core";
import { PermissionPlugin } from "../index";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "fs/promises";
import React from "react";
import path from "path";
import { PluginList } from "../components/plugin-list";
import { mkdirSync } from "fs";
import { z } from "zod";

export default function plugin(p: PermissionPlugin) {
    return [
        createCommand({
            name: "plugin list",
            description: "List all plugins",
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

                const plugins = Array.from(p.bot.plugins.values());

                const fontData = await readFile(fontPath);
                const element = React.createElement(PluginList, { plugins });

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
            name: "plugin disable <name>",
            description: "Disable a plugin globally",
            permission: "admin",
            args: z.string(),
            handler: async (ctx, name) => {
                if (name === "permission" || name === "plugin-manager") {
                    ctx.reply.text(`无法禁用 ${name} 插件`).commit();
                    return;
                }
                p.manager.disablePlugin(name);
                ctx.reply.text(`已全局禁用插件: ${name}`).commit();
            },
        }),
        createCommand({
            name: "plugin disable <type> <id> <name>",
            description: "Disable a plugin for a specific user/group",
            permission: "admin",
            args: [z.enum(["user", "group"]), z.coerce.number(), z.string()],
            handler: async (ctx, args) => {
                const [type, id, name] = args;
                if (name === "permission" || name === "plugin-manager") {
                    ctx.reply.text(`无法为特定目标禁用 ${name} 插件`).commit();
                    return;
                }
                p.manager.disableTarget(id, type, name);
                ctx.reply.text(`已为 ${type} ${id} 禁用插件: ${name}`).commit();
            },
        }),
        createCommand({
            name: "plugin enable <name>",
            description: "Enable a plugin globally",
            permission: "admin",
            args: z.string(),
            handler: async (ctx, name) => {
                p.manager.enablePlugin(name);
                ctx.reply.text(`已全局启用插件: ${name}`).commit();
            },
        }),
        createCommand({
            name: "plugin enable <type> <id> <name>",
            description: "Enable a plugin for a specific user/group",
            permission: "admin",
            args: [z.enum(["user", "group"]), z.coerce.number(), z.string()],
            handler: async (ctx, args) => {
                const [type, id, name] = args;
                p.manager.enableTarget(id, type, name);
                ctx.reply.text(`已为 ${type} ${id} 启用插件: ${name}`).commit();
            },
        }),
    ];
}
