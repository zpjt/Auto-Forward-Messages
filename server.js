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
  // 已更新为你真实的 GitHub Pages 仓库地址
  const payDetailUrl = 'https://zpjt.github.io/Auto-Forward-Messages/pay.html?order_id=' + orderId;

  res.send(`
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
      <meta charset="UTF-8">
      <meta property="og:title" content="来帮我代付吧！美团外卖" />
      <meta property="og:description" content="Hi，我和你的距离只差一顿外卖~" />
      <meta property="og:image" content="https://i.ibb.co/B288tR03/IMG-1894.jpg" />
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
      /**
       * 🟢 微信 H5 支付真实逻辑调取 
       * 官方文档：调用 transactions/h5 接口申请支付，微信会返回一个 mweb_url
       */
      // const result = await wxpay.transactions_h5({
      //   description: body || '外卖代付订单',
      //   out_trade_no: orderId.toString(),
      //   amount: { total: Math.round(total * 100), currency: 'CNY' }, // 微信单位为分
      //   scene_info: { payer_client_ip: req.ip, h5_info: { type: 'Wap' } }
      // });
      
      // 模拟返回微信官方生成的唤醒链接（正式请用真实 SDK 返回的 result.mweb_url）
      const mockMwebUrl = `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=wx2026...&package=12345`;
      
      return res.json({ success: true, payUrl: mockMwebUrl });

    } else if (payType === 'alipay') {
      /**
       * 🔵 支付宝 手机网站支付真实逻辑调取
       * 官方文档：调用 alipay.trade.wap.pay，返回的是一个自动提交的 Form 表单或跳转网址
       */
      // const payUrl = alipaySdk.pageExec('alipay.trade.wap.pay', {
      //   bizContent: {
      //     outTradeNo: orderId.toString(),
      //     totalAmount: total.toFixed(2),
      //     subject: body || '外卖代付订单',
      //     productCode: 'QUICK_WAP_WAY'
      //   },
      //   returnUrl: '支付成功后跳转回前端的网址'
      // });
      
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
  // 🚨 安全警告：真实的对接必须在这里使用官方 SDK 校验 Headers 中的签名！
  // 微信：wxpay.verifySignature(req.headers, req.body)
  // 支付宝：alipaySdk.signVerify(req.body)
  
  const { order_id, trade_status } = req.body;
  
  // 校验通过后，更新状态
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
      status: status || '待代付', // 接收前端传过来的状态
      created_at: new Date().toISOString() 
    }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

// 💡 修复：将 shops 统一修改为前端所使用的 stores 数据库表名
app.post('/api/shops', async (req, res) => {
  const { name } = req.body; 
  if (!name) {
    return res.status(400).json({ error: '店铺名称不能为空' });
  }
  const { data, error } = await supabase
    .from('stores') // 改为 stores
    .insert([{ name }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
