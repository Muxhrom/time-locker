const express = require('express');
const path = require('path');
const app = express();

// 1. 指定静态资源文件夹
app.use(express.static(path.join(__dirname, 'dist')));

// 2. 【关键修改】不使用 app.get('*')，改用 app.use 拦截剩余请求
// 这样可以避开路由正则解析的报错
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 3. 启动端口
const port = 5173;
app.listen(port, () => {
  console.log(`Time Locker is running at http://localhost:${port}`);
});