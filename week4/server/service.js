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

// 添加这段代码来处理根路径请求
let receivedRequests = []; // 存储接收到的请求

app.get("/", (req, res) => {
  // 发送一个简单的HTML页面，显示接收到的数据
  let html = `
    <h2>后端服务状态</h2>
    <p>服务正在运行</p>
    <h2>已接收的请求数据：</h2>
    <pre>${JSON.stringify(receivedRequests, null, 2)}</pre>
  `;
  res.send(html);
});

// 修改原来的POST处理程序，保存请求数据
app.post("/api", (req, res) => {
  const requestBody = req.body;
  console.log("接收到的请求体:", JSON.stringify(requestBody, null, 2));

  // 将请求保存到数组
  receivedRequests.push(requestBody);

  res.json({
    status: "success",
    data: requestBody,
    message: "数据已成功接收"
  });
});
// 启动服务器
app.listen(3000, () => console.log("后端运行在 http://localhost:3000"));