// 认证配置 KEY
const AUTH_KEY = "AUTH_CONFIG";
const DATA_KEY = "USER_DATA";
const TOKEN_KEY = "AUTH_TOKENS";

// 生成简单 token
function generateToken() {
  return crypto.randomUUID() + "-" + Date.now();
}

// 验证 token
async function verifyToken(env, token) {
  if (!token) return false;
  const tokensStr = await env.MY_KV.get(TOKEN_KEY);
  if (!tokensStr) return false;
  const tokens = JSON.parse(tokensStr);
  // token 有效期 24 小时
  const now = Date.now();
  return tokens.some(t => t.token === token && (now - t.createdAt) < 24 * 60 * 60 * 1000);
}

// 保存 token
async function saveToken(env, token) {
  let tokens = [];
  const tokensStr = await env.MY_KV.get(TOKEN_KEY);
  if (tokensStr) {
    tokens = JSON.parse(tokensStr);
    // 清理过期 token
    const now = Date.now();
    tokens = tokens.filter(t => (now - t.createdAt) < 24 * 60 * 60 * 1000);
  }
  tokens.push({ token, createdAt: Date.now() });
  await env.MY_KV.put(TOKEN_KEY, JSON.stringify(tokens));
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 定义统一的跨域头
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 初始化默认账号密码（首次访问时设置）
  const authConfig = await env.MY_KV.get(AUTH_KEY);
  if (!authConfig) {
    // 默认账号: admin, 密码: 123456 (请在KV中修改)
    await env.MY_KV.put(AUTH_KEY, JSON.stringify({ username: "admin", password: "123456" }));
  }

  // 登录接口
  if (url.pathname === "/api/login" && request.method === "POST") {
    try {
      const { username, password } = await request.json();
      const config = JSON.parse(await env.MY_KV.get(AUTH_KEY));
      
      if (username === config.username && password === config.password) {
        const token = generateToken();
        await saveToken(env, token);
        return new Response(JSON.stringify({ success: true, token }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: "账号或密码错误" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // 验证登录状态接口
  if (url.pathname === "/api/check" && request.method === "GET") {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const isValid = await verifyToken(env, token);
    return new Response(JSON.stringify({ loggedIn: isValid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // 数据接口 - GET 读取数据（无需登录）
  if (url.pathname === "/api" && request.method === "GET") {
    const value = await env.MY_KV.get(DATA_KEY);
    return new Response(value || JSON.stringify({ users: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // 数据接口 - POST 保存数据（需要登录）
  if (url.pathname === "/api" && request.method === "POST") {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const isValid = await verifyToken(env, token);
    
    if (!isValid) {
      return new Response(JSON.stringify({ success: false, message: "请先登录" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const data = await request.text();
      await env.MY_KV.put(DATA_KEY, data);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Not Found", { status: 404, headers: corsHeaders });
}