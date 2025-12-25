export async function onRequest(context) {
  const { request, env } = context;
  const key = "USER_DATA";

  // 处理 POST 请求：保存数据
  if (request.method === "POST") {
    const data = await request.text();
    await env.MY_KV.put(key, data);
    return new Response("Saved", { status: 200 });
  }

  // 处理 GET 请求：读取数据
  const value = await env.MY_KV.get(key);
  return new Response(value || JSON.stringify({ users: [] }), {
    headers: { "Content-Type": "application/json" }
  });
}