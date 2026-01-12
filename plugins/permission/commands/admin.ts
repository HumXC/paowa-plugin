import { createCommand } from "@paowa-bot/core";
import { PermissionPlugin } from "../index";
import * as z from "zod";

export default function admin(plugin: PermissionPlugin) {
    return [
        createCommand({
            name: "admin add <id>",
            description: "Add an admin",
            permission: "owner",
            args: z.coerce.number().int().positive(),
            handler: async (ctx, id) => {
                plugin.manager.addAdmin(id);
                ctx.reply.text(`已添加管理员: ${id}`).commit();
            },
        }),
        createCommand({
            name: "admin remove <id>",
            description: "Remove an admin",
            permission: "owner",
            args: z.coerce.number().int().positive(),
            handler: async (ctx, id) => {
                plugin.manager.removeAdmin(id);
                ctx.reply.text(`已移除管理员: ${id}`).commit();
            },
        }),
        createCommand({
            name: "admin list",
            description: "List all admins",
            permission: "admin",
            handler: async (ctx) => {
                const admins = plugin.manager.listAdmins();
                ctx.reply.text(admins.join("\n") || "暂无管理员");
            },
        }),
    ];
}
