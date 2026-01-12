import { createCommand } from "@paowa-bot/core";
import { PermissionPlugin } from "../index";
import z from "zod";

export default function ban(plugin: PermissionPlugin) {
    return [
        createCommand({
            name: "ban user <id>",
            description: "Ban a user from using the bot",
            permission: "owner",
            args: z.coerce.number().int().positive(),
            handler: async (ctx, id) => {
                plugin.manager.addToGlobalBlacklist(id, "user");
                ctx.reply.text(`已拉黑用户: ${id}`).commit();
            },
        }),
        createCommand({
            name: "unban user <id>",
            description: "Unban a user",
            permission: "owner",
            args: z.coerce.number().int().positive(),
            handler: async (ctx, id) => {
                plugin.manager.removeFromGlobalBlacklist(id, "user");
                ctx.reply.text(`已取消拉黑用户: ${id}`).commit();
            },
        }),
        createCommand({
            name: "ban group <id>",
            description: "Ban a group from using the bot",
            permission: "admin",
            args: z.coerce.number().int().positive(),
            handler: async (ctx, id) => {
                plugin.manager.addToGlobalBlacklist(id, "group");
                ctx.reply.text(`已拉黑群: ${id}`).commit();
            },
        }),
        createCommand({
            name: "unban group <id>",
            description: "Unban a group",
            permission: "admin",
            args: z.coerce.number().int().positive(),
            handler: async (ctx, id) => {
                plugin.manager.removeFromGlobalBlacklist(id, "group");
                ctx.reply.text(`已取消拉黑群: ${id}`).commit();
            },
        }),
    ];
}
