import { Manager } from "./index";
import { Bot } from "@paowa-bot/core/bot";
import { Plugin, cacheFile, definePlugin, createCommand } from "@paowa-bot/core";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile } from "fs/promises";
import React from "react";
import path from "path";
import { PluginList } from "./plugin-list";
import { mkdirSync } from "fs";
import { z } from "zod";

export default function plugin(m: Manager) {
    return [
        createCommand({
            name: "plugin list",
            description: "List all plugins",
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

                const plugins = Array.from(m.bot.plugins.values());

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
                if (name === "manager") {
                    ctx.reply.text("无法禁用 manager 插件").commit();
                    return;
                }
                m.bot.permission.disablePlugin(name);
                ctx.reply.text(`已禁用插件: ${name}`).commit();
            },
        }),
        createCommand({
            name: "plugin enable <name>",
            description: "Enable a plugin globally",
            permission: "admin",
            args: z.string(),
            handler: async (ctx, name) => {
                m.bot.permission.enablePlugin(name);
                ctx.reply.text(`已启用插件: ${name}`).commit();
            },
        }),
    ];
}
