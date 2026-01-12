import { definePlugin, Bot, PluginSpec } from "@paowa-bot/core";
import { PermissionManager } from "./manager";
import admin from "./commands/admin";
import ban from "./commands/ban";
import pluginCmd from "./commands/plugin";
import commandCmd from "./commands/command";

export class PermissionPlugin implements PluginSpec {
    meta = {
        name: "permission",
        version: "1.0.0",
        description: "Permission management system",
    };

    config = {
        admin: [] as number[],
        fontPath: null as string | null,
    };

    bot!: Bot;
    manager!: PermissionManager;

    commands = [...admin(this), ...ban(this), ...pluginCmd(this), ...commandCmd(this)];

    onLoad = (bot: Bot) => {
        this.bot = bot;
        this.manager = new PermissionManager(bot);
        bot.registerService("permission", this.manager);

        if (Array.isArray(this.config.admin)) {
            const existingAdmins = new Set(this.manager.listAdmins());
            for (const adminId of this.config.admin) {
                if (!existingAdmins.has(adminId)) {
                    this.manager.addAdmin(adminId);
                }
            }
        }

        bot.useMiddleware(async (ctx, meta, next) => {
            let permConfig = meta.permission;
            if (typeof permConfig === "string") {
                permConfig = { level: permConfig };
            }

            const hasPerm = this.manager.checkPermission(
                ctx,
                meta.pluginName,
                meta.commandName,
                permConfig as any
            );

            if (!hasPerm) {
                if (!ctx.is_group || ctx.is_at_self) {
                    ctx.reply.text("没有权限").commit();
                }
                return;
            }

            await next();
        });
    };
}

export default definePlugin(new PermissionPlugin());
