# Telegram 双向转发机器人

这是一个基于 Cloudflare Workers 架构的 Telegram 双向转发机器人，用于连接普通用户和管理员之间的消息传递。

## 功能特性

- **双向消息转发**：自动将用户消息转发给管理员，管理员回复后自动转发给用户
- **多类型媒体支持**：支持文本、图片、音频、视频、文档等多种媒体类型的转发
- **代码处理**：自动检测代码内容并以文件形式转发
- **会话管理**：记录用户会话信息，支持回复上下文关联
- **管理员控制面板**：提供活跃用户列表和操作指南
- **命令系统**：支持 `/start` 和 `/reply` 等命令
- **消息频率限制**：防止消息发送过于频繁
- **错误处理**：完善的错误捕获和通知机制
- **Webhook 配置**：自动设置 Telegram Webhook
- **请求监控**：记录请求ID和处理时间

## 技术架构

- **运行环境**：Cloudflare Workers
- **开发语言**：JavaScript
- **API**：Telegram Bot API
- **会话存储**：内存存储（memoryStore）

## 配置说明

在部署前，需要在 `worker.js` 文件中配置以下关键参数：

```javascript
const BOT_TOKEN = 'YOUR_BOT_TOKEN';       // Telegram Bot Token
const ADMIN_ID = 'YOUR_ADMIN_USER_ID';    // 管理员用户ID
```

## 部署步骤

1. **创建 Telegram Bot**
   - 联系 @BotFather 创建新机器人
   - 获取 Bot Token

2. **获取管理员用户ID**
   - 可以通过 @userinfobot 获取您的用户ID

3. **部署到 Cloudflare Workers**
   - 登录 Cloudflare 账户
   - 创建新的 Worker
   - 复制 `worker.js` 代码到 Worker
   - 配置 Bot Token 和管理员ID
   - 部署 Worker

4. **设置 Webhook**
   - 访问 `https://your-worker-url.workers.dev?action=setWebhook&secret=YOUR_BOT_TOKEN`
   - 或访问 Worker URL 后添加参数执行 Webhook 设置

## 使用方法

### 用户端

1. 启动机器人：发送 `/start` 命令
2. 直接发送消息给机器人
3. 等待管理员回复

### 管理员端

1. 启动机器人：发送 `/start` 命令获取管理员欢迎消息
2. 查看活跃用户：发送任意非回复消息
3. 回复用户消息：
   - 直接回复机器人转发的用户消息
   - 或使用命令 `/reply 用户ID 回复内容`
4. 查看机器人状态：访问 Worker URL

## 命令列表

### 通用命令

- `/start` - 启动机器人，获取欢迎消息

### 管理员命令

- `/reply 用户ID 回复内容` - 直接回复指定用户

## 错误处理

- 机器人会自动捕获并记录错误
- 关键错误会通过 Telegram 消息通知管理员
- 请求处理错误会返回适当的 HTTP 状态码

## 性能优化

- 请求ID追踪
- 处理时间监控
- 长时间运行任务的异步处理

## 安全注意事项

- Bot Token 作为访问密钥，请妥善保管
- Webhook 设置需要验证 Bot Token
- 敏感信息（如用户ID）在日志中会被正确处理

## 更新日志

### v2.0.0
- 完善的双向消息转发功能
- 支持多种媒体类型
- 代码内容自动检测和文件转发
- 管理员控制面板
- 请求监控和性能优化

## 许可证

MIT License

## 联系方式
Telegram:@Winter_Fog
如有问题或建议，请通过 Telegram 联系机器人管理员。
