const BOT_TOKEN = '8534609677:AAFGQcLKqiCcGhyCgBgzwsaLcTBB6t-UIUw';
const ADMIN_ID = '8346745644';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const memoryStore = { sessions: {} };
async function sendTelegramRequest(method, data = {}) {
  const url = `${API_URL}/${method}`;
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`Telegram API error: ${response.status} ${await response.text()}`);
    return await response.json();
  } catch (error) {
    console.error(`Error sending ${method}:`, error);
    throw error;
  }
}
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function(match) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[match];
  });
}
function formatUserInfo(user) {
  const first_name = user.first_name || '用户';
  const last_name = user.last_name || '';
  const username = user.username ? `@${user.username}` : '';
  return `${first_name} ${last_name} ${username}`.trim();
}
function initUserSession(user_id) {
  if (!memoryStore.sessions[user_id]) {
    memoryStore.sessions[user_id] = { 
      first_seen: new Date().toISOString(), 
      last_seen: new Date().toISOString(), 
      last_active: Date.now(), 
      last_message_time: 0, 
      last_message_id: null, 
      waiting_for_reply: false 
    };
  }
  memoryStore.sessions[user_id].last_seen = new Date().toISOString();
  memoryStore.sessions[user_id].last_active = Date.now();
  return memoryStore.sessions[user_id];
}
async function handleUserMessage(message) {
  const user_id = message.from.id.toString();
  const user = message.from;
  const user_name = formatUserInfo(user);
  const session = initUserSession(user_id);
  const now = Date.now();
  const lastMessageTime = session.last_message_time || 0;
  const messageInterval = now - lastMessageTime;
  const MIN_INTERVAL = 3000;
  if (messageInterval < MIN_INTERVAL) {
    try {
      await sendTelegramRequest('sendMessage', {
        chat_id: user_id,
        text: '发送消息太频繁了，请稍后再试。'
      });
      return;
    } catch (error) { console.error('Failed to send rate limit message:', error); }
    return;
  }
  session.last_message_time = now;
  session.waiting_for_reply = true;
  session.last_message_id = message.message_id;
  session.username = user.username || null;
  session.first_name = user.first_name || '';
  session.last_name = user.last_name || '';
  let forward_text = `🌟 <b>新消息提醒</b> 🌟
`;
  forward_text += `👤 <i>用户：</i>${user_name}
`;
  forward_text += `🆔 <i>用户ID：</i><code>${user_id}</code>
`;
  if (message.text) {
    const text = message.text;
    const isCode = text.includes('```') || text.includes('#include') || 
                  text.includes('function') || text.includes('import') || 
                  text.includes('class') || text.includes('def ') || 
                  text.includes('var ') || text.includes('let ') || text.includes('const ');
    if (text.length > 100 || isCode) {
      forward_text += `📄 <b>用户发送了长文本/代码</b>
`;
      forward_text += `<blockquote>文本长度：${text.length}字符</blockquote>
`;
      const blob = new Blob([text], { type: 'text/plain' });
      const fileName = isCode ? `code_${user_id}_${Date.now()}.txt` : `message_${user_id}_${Date.now()}.txt`;
      try {
        await sendTelegramRequest('sendMessage', {
          chat_id: ADMIN_ID,
          text: forward_text,
          parse_mode: 'HTML'
        });
        const formData = new FormData();
        formData.append('chat_id', ADMIN_ID);
        formData.append('document', blob, fileName);
        await fetch(`${API_URL}/sendDocument`, {
          method: 'POST',
          body: formData
        });
      } catch (error) {
        console.error('Failed to send long text as file:', error);
        forward_text += `💬 <b>文件发送失败，以下是原始消息：</b>
`;
        forward_text += `<blockquote>${escapeHtml(text.substring(0, 1000))}${text.length > 1000 ? '...(消息过长被截断)' : ''}</blockquote>`;
        await sendTelegramRequest('sendMessage', {
          chat_id: ADMIN_ID,
          text: forward_text,
          parse_mode: 'HTML'
        });
      }
    } else {
      forward_text += `💬 <b>用户发送的消息：</b>
`;
      forward_text += `<blockquote>${escapeHtml(text)}</blockquote>`;
      await sendTelegramRequest('sendMessage', {
        chat_id: ADMIN_ID,
        text: forward_text,
        parse_mode: 'HTML'
      });
    }
  } else if (message.sticker) {
    forward_text += `😀 <b>用户发送了表情包</b>
`;
    forward_text += `<blockquote>🎨 表情包消息</blockquote>`;
    await sendTelegramRequest('sendSticker', {
      chat_id: ADMIN_ID,
      sticker: message.sticker.file_id
    });
    await sendTelegramRequest('sendMessage', {
      chat_id: ADMIN_ID,
      text: forward_text,
      parse_mode: 'HTML'
    });
  } else if (message.photo || message.document || message.audio || message.video) {
    const media_type = message.photo ? '图片' : message.document ? '文档' : message.audio ? '音频' : '视频';
    forward_text += `📤 <b>用户发送了${media_type}</b>
`;
    forward_text += `<blockquote>${media_type === '图片' ? '🖼️ 图片消息' : media_type === '文档' ? '📄 文档消息' : media_type === '音频' ? '🎵 音频消息' : '🎬 视频消息'}</blockquote>`;
    const media_params = { 
      chat_id: ADMIN_ID, 
      caption: forward_text, 
      parse_mode: 'HTML'
    };
    if (message.photo) {
      media_params.photo = message.photo[message.photo.length - 1].file_id;
      media_params.parse_mode = 'HTML';
      await sendTelegramRequest('sendPhoto', media_params);
    } else if (message.document) {
      media_params.document = message.document.file_id;
      media_params.parse_mode = 'HTML';
      await sendTelegramRequest('sendDocument', media_params);
    } else if (message.audio) {
      media_params.audio = message.audio.file_id;
      media_params.parse_mode = 'HTML';
      await sendTelegramRequest('sendAudio', media_params);
    } else if (message.video) {
      media_params.video = message.video.file_id;
      media_params.parse_mode = 'HTML';
      await sendTelegramRequest('sendVideo', media_params);
    }
  }
  if (!memoryStore.sessions[user_id].last_message_id) {
    await sendTelegramRequest('sendMessage', {
      chat_id: ADMIN_ID,
      text: `🎉 <b>新用户加入！</b>\n\n👤 <i>用户名：</i>${user_name}\n🆔 <i>用户ID：</i><code>${user_id}</code>\n\n🎊 欢迎新用户！`,
      parse_mode: 'HTML'
    });
  }
}
async function handleAdminReply(message) {
  if (message.reply_to_message) {
    const reply_text = message.reply_to_message.text || message.reply_to_message.caption || '';
    let user_id = null;
    const patterns = [
      /ID:\s*(\d+)/,
      /用户ID：\s*(\d+)/,
      /用户ID：(\d+)/,
      /ID: (\d+)/,
      /用户ID：(\d+)/,
      /ID：(\d+)/,
      /(\d{5,12})/
    ];
    for (const pattern of patterns) {
      const match = reply_text.match(pattern);
      if (match && match[1]) {
        user_id = match[1];
        break;
      }
    }
    if (!user_id && message.reply_to_message.forward_from) {
      user_id = message.reply_to_message.forward_from.id.toString();
    }
    if (user_id) {
      const reply_message = message.text || '📤 发送了媒体文件';
      let reply_success = false;
      try {
        if (message.text) {
          await sendTelegramRequest('sendMessage', {
            chat_id: user_id,
            text: reply_message,
            reply_to_message_id: memoryStore.sessions[user_id]?.last_message_id || undefined
          });
        } else if (message.photo || message.document || message.audio || message.video) {
          const media_params = { chat_id: user_id, reply_to_message_id: memoryStore.sessions[user_id]?.last_message_id || undefined };
          if (message.photo) { media_params.photo = message.photo[message.photo.length - 1].file_id; await sendTelegramRequest('sendPhoto', media_params); }
          else if (message.document) { media_params.document = message.document.file_id; await sendTelegramRequest('sendDocument', media_params); }
          else if (message.audio) { media_params.audio = message.audio.file_id; await sendTelegramRequest('sendAudio', media_params); }
          else if (message.video) { media_params.video = message.video.file_id; await sendTelegramRequest('sendVideo', media_params); }
        }
        reply_success = true;
        if (memoryStore.sessions[user_id]) memoryStore.sessions[user_id].waiting_for_reply = false;
      } catch (error) { console.error('Failed to send admin reply:', error); }
      if (reply_success) {
        await sendTelegramRequest('sendMessage', {
          chat_id: ADMIN_ID,
          text: `✅ 消息已成功转发给用户(ID: ${user_id})`,
          reply_to_message_id: message.message_id
        });
      } else {
        await sendTelegramRequest('sendMessage', {
          chat_id: ADMIN_ID,
          text: `❌ 消息发送失败，请检查用户ID是否有效：${user_id}`,
          reply_to_message_id: message.message_id
        });
      }
    } else {
      const active_users = Object.entries(memoryStore.sessions)
        .sort(([,a], [,b]) => b.last_active - a.last_active)
        .slice(0, 5)
        .map(([id]) => `👤 用户ID: ${id}`)
        .join('\n');
      await sendTelegramRequest('sendMessage', {
        chat_id: ADMIN_ID,
        text: `❌ 无法识别要回复的用户\n\n📱 最近活跃用户:\n${active_users || '暂无活跃用户'}\n\n💡 请直接回复包含用户ID的消息来回复用户。`
      });
    }
  } else {
    const active_users = Object.entries(memoryStore.sessions)
      .sort(([,a], [,b]) => b.last_active - a.last_active)
      .slice(0, 5)
      .map(([id, session]) => {
        const username = session.username ? `@${session.username}` : '未知用户';
        return `👤 ${username} (ID: ${id})`;
      })
      .join('\n');
    await sendTelegramRequest('sendMessage', {
      chat_id: ADMIN_ID,
      text: `📋 管理员操作面板\n\n最近活跃用户:\n${active_users || '暂无活跃用户'}\n\n💡 使用指南: 直接回复用户消息即可进行回复。`
    });
  }
}
async function handleCommand(message) {
  const user_id = message.from.id.toString();
  const command = message.text.split(' ')[0];
  const text = message.text || '';
  switch (command) {
    case '/start':
      let welcome_text;
      if (user_id === ADMIN_ID) {
        welcome_text = "您好！吟江序\n" + "花开一刻皆是美，花败那时皆是悔.";
      } else {
        welcome_text = "您好！我是一个双向转发机器人。\n" + "您可以发送消息给我，我会将消息转发给吟江序。\n" + "吟江序回复后，我会将回复转发给您。\n\n" + "请直接输入您想发送的内容。";
      }
      await sendTelegramRequest('sendMessage', { chat_id: user_id, text: welcome_text });
      if (user_id !== ADMIN_ID) {
        const user_name = formatUserInfo(message.from);
        await sendTelegramRequest('sendMessage', {
          chat_id: ADMIN_ID,
          text: `🔔 新用户 ${user_name} (ID: ${user_id}) 开始使用机器人！`
        });
      }
      break;
    case '/reply':
      if (user_id === ADMIN_ID) {
        const reply_match = text.match(/^\/reply\s+(\d+)\s+(.+)$/s);
        if (reply_match && reply_match[1] && reply_match[2]) {
          const target_user_id = reply_match[1];
          const reply_content = reply_match[2];
          let reply_success = false;
          try {
            await sendTelegramRequest('sendMessage', {
              chat_id: target_user_id,
              text: reply_content,
              reply_to_message_id: memoryStore.sessions[target_user_id]?.last_message_id || undefined
            });
            reply_success = true;
            if (memoryStore.sessions[target_user_id]) memoryStore.sessions[target_user_id].waiting_for_reply = false;
          } catch (error) { console.error('Failed to send admin reply by command:', error); }
          if (reply_success) {
            await sendTelegramRequest('sendMessage', {
              chat_id: ADMIN_ID,
              text: `✅ 消息已成功转发给用户(ID: ${target_user_id})`,
              reply_to_message_id: message.message_id
            });
          } else {
            await sendTelegramRequest('sendMessage', {
              chat_id: ADMIN_ID,
              text: `❌ 消息发送失败，请检查用户ID是否有效：${target_user_id}`,
              reply_to_message_id: message.message_id
            });
          }
        } else {
          await sendTelegramRequest('sendMessage', {
            chat_id: ADMIN_ID,
            text: '❓ 命令格式错误\n正确格式：/reply 用户ID 回复内容\n例如：/reply 123456789 您好，这是我的回复！',
            reply_to_message_id: message.message_id
          });
        }
      } else {
        await sendTelegramRequest('sendMessage', {
          chat_id: user_id,
          text: '❓ 未知命令，请直接输入您想发送的内容。'
        });
      }
      break;
    default:
      if (user_id !== ADMIN_ID) {
        await sendTelegramRequest('sendMessage', {
          chat_id: user_id,
          text: '❓ 未知命令，请直接输入您想发送的内容。'
        });
      }
  }
}
async function handleCallbackQuery(callback_query) {
  try {
    const data = callback_query.data;
    const user_id = callback_query.from.id.toString();
    await sendTelegramRequest('answerCallbackQuery', {
      callback_query_id: callback_query.id,
      text: '未知操作'
    });
  } catch (error) {
    console.error('处理回调查询失败:', error);
    try {
      await sendTelegramRequest('sendMessage', {
        chat_id: ADMIN_ID,
        text: `❌ 处理回调查询时发生错误：${error.message}`
      });
    } catch (notifyError) { console.error('Failed to notify admin about callback query error:', notifyError); }
  }
}
async function setWebhook(webhook_url) {
  try {
    console.log(`Setting webhook to: ${webhook_url}`);
    const webhookConfig = { url: webhook_url, max_connections: 40, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true };
    const response = await sendTelegramRequest('setWebhook', webhookConfig);
    console.log(`Webhook successfully set: ${response.description || 'No description'}`);
    try {
      await sendTelegramRequest('sendMessage', {
        chat_id: ADMIN_ID,
        text: `🔧 机器人已成功配置！\n\n` + `✅ Webhook设置成功\n` + `🌐 Webhook URL: ${webhook_url}\n` + `📅 时间: ${new Date().toLocaleString()}`
      });
    } catch (notifyError) { console.error('Failed to notify admin about webhook setup:', notifyError); }
    return response;
  } catch (error) {
    console.error('Error setting webhook:', error);
    try {
      await sendTelegramRequest('sendMessage', {
        chat_id: ADMIN_ID,
        text: `❌ Webhook设置失败！\n\n` + `🌐 尝试的URL: ${webhook_url}\n` + `📅 时间: ${new Date().toLocaleString()}\n` + `🔍 错误: ${error.message}\n\n` + `💡 请检查URL是否正确并确保机器人能够访问。`
      });
    } catch (notifyError) { console.error('Failed to notify admin about webhook error:', notifyError); }
    throw error;
  }
}
async function handleRequest(request) {
  const url = new URL(request.url);
  try {
    if (url.pathname.endsWith('/setWebhook') || url.searchParams.get('action') === 'setWebhook') {
      console.log('Processing setWebhook request');
      const secret = url.searchParams.get('secret');
      if (secret !== BOT_TOKEN) return new Response('Unauthorized', { status: 401 });
      const baseUrl = `https://${request.headers.get('host')}`;
      await setWebhook(baseUrl);
      return new Response(`Webhook set successfully to: ${baseUrl}`, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        console.log('Received update:', JSON.stringify(update, null, 2).substring(0, 200) + '...');
        if (update.message) {
          const chat_id = update.message.chat.id.toString();
          initUserSession(chat_id);
          if (chat_id === ADMIN_ID && update.message.reply_to_message) {
            console.log(`Processing admin reply from ${chat_id}`);
            await handleAdminReply(update.message);
          } else if (update.message.text && update.message.text.startsWith('/')) {
            console.log(`Processing command from ${chat_id}: ${update.message.text}`);
            await handleCommand(update.message);
          } else {
            console.log(`Processing message from user ${chat_id}`);
            await handleUserMessage(update.message);
          }
        }
        if (update.callback_query) {
          const user_id = update.callback_query.from.id.toString();
          console.log(`Processing callback query from ${user_id}: ${update.callback_query.data}`);
          initUserSession(user_id);
          await handleCallbackQuery(update.callback_query);
        }
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Error processing update:', error);
        try {
          await sendTelegramRequest('sendMessage', {
            chat_id: ADMIN_ID,
            text: `🚨 机器人处理更新时出错！\n\n` + `🔍 错误类型: ${error.name}\n` + `📝 错误信息: ${error.message}\n` + `📅 时间: ${new Date().toLocaleString()}\n\n` + `💡 请检查机器人日志获取详细信息。`
          });
        } catch (notifyError) { console.error('Failed to notify admin about processing error:', notifyError); }
        return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }
    if (request.method === 'GET') {
      const secret = url.searchParams.get('secret');
      const isAdmin = secret === BOT_TOKEN;
      let statusText = `Bot Status: Running\nBot ID: ${BOT_TOKEN.split(':')[0]}\nAdmin ID: ${ADMIN_ID}\nTime: ${new Date().toLocaleString()}`;
      if (isAdmin) {
        statusText += `\n\n管理员访问权限已确认`;
      } else {
        statusText += `\n\n设置Webhook: 访问 ?action=setWebhook`;
      }
      return new Response(statusText, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: { 'X-Bot-Status': 'Healthy', 'X-Bot-Time': new Date().toISOString() } });
    }
    return new Response('Method Not Allowed', { status: 405, headers: { 'Content-Type': 'text/plain', 'Allow': 'GET, POST, HEAD' } });
  } catch (error) {
    console.error('Critical error in handleRequest:', error);
    return new Response('Internal Server Error', { status: 500, headers: { 'Content-Type': 'text/plain' } });
  }
}
export default {
  async fetch(request, env, ctx) {
    const startTime = performance.now();
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    console.log(`[${requestId}] Processing ${request.method} request to ${url.pathname}`);
    try {
      const response = await handleRequest(request);
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      console.log(`[${requestId}] Request processed in ${processingTime.toFixed(2)}ms with status ${response.status}`);
      const responseWithHeaders = new Response(response.body, response);
      responseWithHeaders.headers.set('X-Request-ID', requestId);
      responseWithHeaders.headers.set('X-Processing-Time', processingTime.toFixed(2) + 'ms');
      responseWithHeaders.headers.set('X-Bot-Version', '2.0.0');
      if (processingTime > 500) {
        ctx.waitUntil(new Promise(resolve => {
          setTimeout(() => { console.log(`[${requestId}] Extended processing complete`); resolve(); }, 1000);
        }));
      }
      return responseWithHeaders;
    } catch (error) {
      const endTime = performance.now();
      console.error(`[${requestId}] Request failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
      return new Response(`Critical Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain', 'X-Request-ID': requestId, 'X-Error': error.name }
      });
    }
  }
};
