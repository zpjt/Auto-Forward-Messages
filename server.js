/**
 * 修改后：同时返回支付宝和微信的支付链接
 */
app.post('/api/pay', async (req, res) => {
  const { orderId, total, body } = req.body;

  try {
    // 模拟生成微信和支付宝各自的支付/代付链接
    const mockMwebUrl = `https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?prepay_id=wx2026_${orderId}`;
    const mockAliPayUrl = `https://openapi.alipay.com/gateway.do?order_id=${orderId}`;

    return res.json({ 
      success: true, 
      wxPayUrl: mockMwebUrl, 
      alipayUrl: mockAliPayUrl 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
