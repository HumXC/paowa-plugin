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
import plugin from "./plugin";
import admin from "./admin";
import ban from "./ban";
import command from "./command";

export class Manager implements Plugin {
    bot: Bot = null as any;
    meta = {
        name: "manager",
        version: "1.0.0",
        description: "A simple example plugin",
        scope: "all" as const,
    };

    config = {
        fontPath: null,
        admin: [] as number[],
    };
    onLoad: (bot: Bot) => void = (ctx) => {
        this.bot = ctx;

        if (Array.isArray(this.config.admin)) {
            const existingAdmins = new Set(this.bot.permission.listAdmins());
            for (const adminId of this.config.admin) {
                if (!existingAdmins.has(adminId)) {
                    this.bot.permission.addAdmin(adminId);
                }
            }
        }
    };
    commands = [...plugin(this), ...admin(this), ...ban(this), ...command(this)];
}
export default definePlugin(new Manager());
