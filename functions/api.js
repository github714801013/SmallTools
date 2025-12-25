export async function onRequest(context) {
  const { request, env } = context;
  const key = "USER_DATA";

  // 定义 CORS 响应头
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 1. 处理 OPTIONS 预检请求 (解决 405 的核心)
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
      // 检查是否有数据传入
      if (!data) throw new Error("Empty body");
      
      await env.MY_KV.put(key, data);
      
      return new Response(JSON.stringify({ message: "Saved" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: corsHeaders 
      });
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

  // 4. 其他方法返回 405
  return new Response("Method Not Allowed", { 
    status: 405, 
    headers: corsHeaders 
  });
}