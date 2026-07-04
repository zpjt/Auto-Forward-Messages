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

// 获取订单（已修复表名并增加 parseInt 转换）
app.get('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('订单')
    .select('*')
    .eq('id', parseInt(req.params.id))
    .single();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// 创建订单（已修复表名）
app.post('/api/orders', async (req, res) => {
  const { content, total } = req.body;
  const { data, error } = await supabase
    .from('订单')
    .insert([{ content, total, status: '待支付' }])
    .select();
    
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, data });
});

// 支付通知（已修复表名）
app.post('/api/pay/notify', async (req, res) => {
  const { order_id, trade_status } = req.body;
  if (trade_status === 'SUCCESS') {
    await supabase
      .from('订单')
      .update({ status: '已支付' })
      .eq('id', parseInt(order_id));
      
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'failed' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
