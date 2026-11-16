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

  try {
    // 页面路由（已经去掉public/，直接读根目录文件）
    if (path === "/" || path === "/index.html") {
      const html = await Deno.readTextFile("./index.html");
      return new Response(html, { headers: { "content-type": "text/html;charset=utf-8" } });
    } else if (path === "/admin.html") {
      const html = await Deno.readTextFile("./admin.html");
      return new Response(html, { headers: { "content-type": "text/html;charset=utf-8" } });
    } else if (path === "/chat.html") {
      const html = await Deno.readTextFile("./chat.html");
      return new Response(html, { headers: { "content-type": "text/html;charset=utf-8" } });
    } else if (path === "/trial.html") {
      const html = await Deno.readTextFile("./trial.html");
      return new Response(html, { headers: { "content-type": "text/html;charset=utf-8" } });
    }
    // 图片路由
    else if (path === "/logo.jpg") {
      const data = await Deno.readFile("./logo.jpg");
      return new Response(data, { headers: { "content-type": "image/jpeg" } });
    } else if (path === "/li-ao.jpg") {
      const data = await Deno.readFile("./li-ao.jpg");
      return new Response(data, { headers: { "content-type": "image/jpeg" } });
    } else if (path === "/anna.jpg") {
      const data = await Deno.readFile("./anna.jpg");
      return new Response(data, { headers: { "content-type": "image/jpeg" } });
    }

    // ========== 下面是你的数据库API接口，原样保留 ==========
    else if (path === "/api/add-word") {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status:405 });
      const body = await req.json();
      const r = await client.execute({
        sql: "INSERT INTO words (word, meaning) VALUES (?, ?)",
        args: [body.word, body.meaning]
      });
      return Response.json({ok:true, r});
    }
    else if (path === "/api/list-word") {
      const res = await client.execute("SELECT * FROM words ORDER BY id DESC");
      return Response.json(res.rows);
    }
    else if (path === "/api/del-word") {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status:405 });
      const body = await req.json();
      await client.execute({sql:"DELETE FROM words WHERE id=?", args:[body.id]});
      return Response.json({ok:true});
    }

    return new Response("404 Not Found", { status:404 });
  } catch (e) {
    console.error(e);
    return new Response(`Server Error:${(e as Error).message}`, { status:500 });
  }
}

serve(handler, { port: 8000 });
