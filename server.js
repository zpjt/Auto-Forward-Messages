<div class="payment-container">
  <!-- 支付宝支付区块 -->
  <div class="pay-card" id="alipay-section">
    <p>代付收款码 (支付宝)</p>
    <img id="alipay-qrcode" src="" alt="支付宝二维码" />
    <a href="#" id="alipay-btn" class="btn alipay-btn">点击唤醒支付宝付款</a>
  </div>

  <!-- 微信支付区块 -->
  <div class="pay-card" id="wechat-section">
    <p>代付收款码 (微信)</p>
    <img id="wechat-qrcode" src="" alt="微信二维码" />
    <a href="#" id="wechat-btn" class="btn wechat-btn">点击唤醒微信付款</a>
  </div>
</div>

<script>
  // 页面加载后，请求后端获取两个支付链接
  async function loadPayUrls() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('order_id');

    try {
      // 可以在这里分别请求或由一个接口返回两者的链接
      // 示例：同时发起两个请求获取各自的 PayUrl
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId })
      });
      const data = await res.json();
      
      // 假设后端返回包含 alipayUrl 和 wxPayUrl
      if (data.success) {
        document.getElementById('alipay-btn').href = data.alipayUrl;
        document.getElementById('wechat-btn').href = data.wxPayUrl;
      }
    } catch (e) {
      console.error('获取支付链接失败', e);
    }
  }
  loadPayUrls();
</script>
