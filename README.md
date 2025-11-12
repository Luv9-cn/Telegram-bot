# Telegram 双向转发机器人

## 项目概述

这是一个基于 Cloudflare Workers 开发的 Telegram 双向转发机器人。该机器人能够接收普通用户的消息并转发给管理员，同时也能将管理员的回复转发回对应的用户，实现用户与管理员之间的高效沟通桥梁。

## 功能特点

### 核心功能

- **双向消息转发**：将用户消息转发给管理员，将管理员回复转发给用户
- **多种消息类型支持**：支持文本、图片、文档、音频、视频和表情包等多种媒体类型
- **消息频率限制**：防止用户发送消息过于频繁
- **长文本/代码处理**：自动识别长文本和代码内容，以文件形式发送
- **用户会话管理**：维护用户会话信息，包括首次访问时间、最后活动时间等

### 管理员功能

- **直接回复用户**：管理员可以直接回复用户消息进行互动
- **命令支持**：支持 `/reply 用户ID 回复内容` 命令进行精确回复
- **活跃用户列表**：查看最近活跃的用户信息
- **错误通知**：机器人运行异常时自动通知管理员

### 系统特性

- **Webhook 配置**：支持自动设置 Telegram Webhook
- **请求日志**：详细记录每次请求的处理过程和时间
- **错误处理**：完善的错误捕获和处理机制
- **性能监控**：记录请求处理时间，支持慢请求的扩展处理

## 技术架构

### 技术栈

- **开发语言**：JavaScript
- **运行环境**：Cloudflare Workers
- **API 集成**：Telegram Bot API

### 核心模块

1. **请求处理模块**：接收和处理来自 Telegram 的 Webhook 请求
2. **消息转发模块**：处理用户和管理员之间的消息转发
3. **会话管理模块**：维护用户会话状态和信息
4. **命令处理模块**：处理用户和管理员发送的命令
5. **错误处理模块**：捕获和报告系统异常

## 核心功能详解

### 1. 消息转发功能

#### 1.1 用户消息处理

```javascript
async function handleUserMessage(message) {
  // 初始化用户会话
  const user_id = message.from.id.toString();
  const user = message.from;
  const user_name = formatUserInfo(user);
  const session = initUserSession(user_id);
  
  // 消息频率限制
  const now = Date.now();
  const lastMessageTime = session.last_message_time || 0;
  const messageInterval = now - lastMessageTime;
  const MIN_INTERVAL = 3000; // 最小消息间隔3秒
  
  // 根据消息类型处理转发逻辑
  if (message.text) {
    // 处理文本消息
  } else if (message.sticker) {
    // 处理表情包
  } else if (message.photo || message.document || message.audio || message.video) {
    // 处理媒体文件
  }
}
```

#### 1.2 管理员回复处理

```javascript
async function handleAdminReply(message) {
  if (message.reply_to_message) {
    // 从回复消息中提取用户ID
    // 将管理员回复转发给对应的用户
  } else {
    // 显示最近活跃用户列表
  }
}
```

### 2. 命令处理功能

```javascript
async function handleCommand(message) {
  const user_id = message.from.id.toString();
  const command = message.text.split(' ')[0];
  
  switch (command) {
    case '/start':
      // 发送欢迎消息给用户或管理员
      break;
      
    case '/reply':
      if (user_id === ADMIN_ID) {
        // 处理管理员的回复命令
      }
      break;
  }
}
```

### 3. Webhook 配置

```javascript
async function setWebhook(webhook_url) {
  try {
    // 配置 Webhook
    const webhookConfig = { 
      url: webhook_url, 
      max_connections: 40, 
      allowed_updates: ['message', 'callback_query'], 
      drop_pending_updates: true 
    };
    const response = await sendTelegramRequest('setWebhook', webhookConfig);
    
    // 通知管理员 Webhook 设置状态
    await sendTelegramRequest('sendMessage', {
      chat_id: ADMIN_ID,
      text: `🔧 机器人已成功配置！\n\n` + `✅ Webhook设置成功\n` + `🌐 Webhook URL: ${webhook_url}\n` + `📅 时间: ${new Date().toLocaleString()}`
    });
    
    return response;
  } catch (error) {
    // 处理 Webhook 设置失败的情况
  }
}
```

### 4. 请求处理入口

```javascript
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 处理 Webhook 设置请求
    if (url.pathname.endsWith('/setWebhook') || url.searchParams.get('action') === 'setWebhook') {
      // 验证密钥并设置 Webhook
    }
    
    // 处理 POST 请求（来自 Telegram 的更新）
    if (request.method === 'POST') {
      const update = await request.json();
      
      if (update.message) {
        // 根据消息类型处理
      }
      
      if (update.callback_query) {
        // 处理回调查询
      }
    }
    
    // 处理 GET 请求（状态检查）
    if (request.method === 'GET') {
      // 返回机器人状态信息
    }
    
    // 处理 HEAD 请求（健康检查）
    if (request.method === 'HEAD') {
      // 返回健康状态头信息
    }
  } catch (error) {
    // 处理关键错误
  }
}
```

## 部署和配置

### 环境配置

1. **Telegram Bot Token**：通过 [@BotFather](https://t.me/BotFather) 获取
2. **管理员 ID**：确定谁可以接收用户消息和回复用户
3. **Cloudflare Workers**：创建一个新的 Worker 项目

### 部署步骤

1. 将代码部署到 Cloudflare Workers
2. 访问 Worker URL + `?action=setWebhook&secret=您的BotToken` 设置 Webhook
3. 机器人将自动通知管理员 Webhook 设置状态

## 使用指南

### 普通用户使用

1. 向机器人发送 `/start` 命令开始使用
2. 直接发送消息给机器人，消息将被转发给管理员
3. 等待管理员回复，回复将由机器人转发给您

### 管理员使用

1. 向机器人发送 `/start` 命令获取管理面板
2. 直接回复用户消息进行回复
3. 使用 `/reply 用户ID 回复内容` 命令进行精确回复
4. 查看最近活跃用户列表了解当前状态

## 安全特性

- **访问控制**：关键操作需要验证 Bot Token
- **输入验证**：对用户输入进行适当的转义和验证
- **错误处理**：完善的异常捕获和处理机制
- **频率限制**：防止用户发送消息过于频繁

## 性能优化

- **请求跟踪**：为每个请求生成唯一 ID 进行跟踪
- **性能监控**：记录请求处理时间
- **慢请求处理**：对处理时间超过 500ms 的请求进行特殊处理
- **响应头信息**：添加有用的响应头信息便于调试和监控

## 未来改进方向

1. **数据库集成**：使用持久化存储替代内存存储
2. **用户管理功能**：添加黑名单、白名单等管理功能
3. **消息模板**：支持管理员使用预定义的回复模板
4. **多管理员支持**：支持多个管理员协同工作
5. **消息统计分析**：添加消息统计和分析功能
