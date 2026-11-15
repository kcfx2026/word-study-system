import { serve } from "https://deno.land/std@0.214.0/http/server.ts";
import { Client } from "https://esm.sh/@libsql/client/web";

// 读取环境变量
const TURSO_URL = Deno.env.get("TURSO_DATABASE_URL")!;
const TURSO_TOKEN = Deno.env.get("TURSO_AUTH_TOKEN")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

const client = new Client({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

// 初始化数据表（第一次访问自动建表）
async function initDB() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      meaning TEXT NOT NULL,
      add_time TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
await initDB();

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // ========== cron唤醒&提醒触发接口 ==========
  if (method === "GET" && path === "/api/cron-trigger") {
    // 有密钥就校验，没设置密钥就直接放行
    const secretParam = url.searchParams.get("secret");
    if (CRON_SECRET && secretParam !== CRON_SECRET) {
      return new Response(JSON.stringify({ msg: "无权限" }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    console.log("Cron任务执行：检查复习提醒");
    // 这里你后续可以在这里加微信提醒逻辑，当前先打印日志
    return Response.json({ ok: true, msg: "cron执行完成，复习提醒已检查" });
  }

  // 静态页面：前端html
  if (path === "/" || path === "/index.html") {
    const html = await Deno.readTextFile("./public/index.html");
    return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
  }
  if (path === "/admin.html") {
    const html = await Deno.readTextFile("./public/admin.html");
    return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
  }

  // ========== 单词接口示例 ==========
  // 获取全部单词
  if (method === "GET" && path === "/api/words") {
    const res = await client.execute("SELECT * FROM words ORDER BY id DESC");
    return Response.json(res.rows);
  }

  // 添加单词
  if (method === "POST" && path === "/api/words") {
    const body = await req.json();
    await client.execute({
      sql: "INSERT INTO words (word, meaning) VALUES (?, ?)",
      args: [body.word, body.meaning]
    });
    return Response.json({ ok: true });
  }

  // 删除单词
  if (method === "DELETE" && path.startsWith("/api/words/")) {
    const id = path.split("/").pop();
    await client.execute({ sql: "DELETE FROM words WHERE id = ?", args: [id] });
    return Response.json({ ok: true });
  }

  return new Response("404 Not Found", { status: 404 });
}

serve(handler, { port: 8000 });
console.log("服务启动，端口8000");
