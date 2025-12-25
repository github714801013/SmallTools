export async function onRequest(context) {
  const { request, env } = context;
  const key = "USER_DATA";

  // 定义统一的跨域头
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 1. 处理 OPTIONS 预检请求 (解决 405 的关键)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 2. 处理 POST 请求：保存数据
  if (request.method === "POST") {
    try {
      const data = await request.text();
      await env.MY_KV.put(key, data);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(e.message, { status: 500, headers: corsHeaders });
    }
  }

  // 3. 处理 GET 请求：读取数据
  if (request.method === "GET") {
    const value = await env.MY_KV.get(key);
    return new Response(value || JSON.stringify({ users: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
}