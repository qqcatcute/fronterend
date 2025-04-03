const express = require("express");
const app = express();

// 启用 JSON 解析中间件
app.use(express.json({ limit: '50mb' })); // 增加限制处理大型图片

// 设置CORS头 暂时没有用
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); // 允许的HTTP方法
  res.header("Access-Control-Allow-Headers", "Content-Type"); // 允许的请求头

  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // 直接响应预检请求
  }
  next();
});

// 处理 POST 请求
app.post("/api", (req, res) => {
  const requestBody = req.body; // 获取请求体
  console.log("接收到的请求体:", requestBody);

  

  

  res.json({
    status: "success",
    data: requestBody,
    message: "数据已成功接收"
  });
});

// 启动服务器
app.listen(3000, () => console.log("后端运行在 http://localhost:3000"));