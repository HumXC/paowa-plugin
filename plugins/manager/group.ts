import { createCommand } from "@paowa-bot/core";
import { Manager } from ".";

export default function group(m: Manager) {
    return [
        createCommand({
            name: "group disable",
            description: "Disable bot in current group",
            scope: "group",
            permission: "admin",
            handler: async (ctx) => {
                if (!ctx.is_group) {
                    ctx.reply.text("此命令只能在群聊中使用").commit();
                    return;
                }
                m.bot.permission.disableGroup(ctx.group_id);
                ctx.reply.text("已禁止机器人在当前群运行").commit();
            },
        }),
        createCommand({
            name: "group enable",
            description: "Enable bot in current group",
            scope: "group",
            permission: "admin",
            handler: async (ctx) => {
                if (!ctx.is_group) {
                    ctx.reply.text("此命令只能在群聊中使用").commit();
                    return;
                }
                m.bot.permission.enableGroup(ctx.group_id);
                ctx.reply.text("已允许机器人在当前群运行").commit();
            },
        }),
    ];
}
