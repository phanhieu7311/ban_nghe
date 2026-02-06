// Telegram notification utility

export interface OrderNotification {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    salePrice?: number | null;
  }[];
  total: number;
  paymentMethod?: string;
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

export async function sendTelegramNotification(order: OrderNotification): Promise<boolean> {
  const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn('Telegram credentials not configured');
    return false;
  }

  const itemsList = order.items
    .map((item) => {
      const effectivePrice = item.salePrice && item.salePrice < item.price ? item.salePrice : item.price;
      const priceDisplay = item.salePrice && item.salePrice < item.price
        ? `${formatPrice(item.salePrice)} (gốc: ${formatPrice(item.price)})`
        : formatPrice(item.price);
      return `  • ${item.name} x${item.quantity} @ ${priceDisplay} = ${formatPrice(effectivePrice * item.quantity)}`;
    })
    .join('\n');

  const message = `
🛒 *ĐƠN HÀNG MỚI*

📋 *Mã đơn:* \`${order.orderId}\`

👤 *Khách hàng:*
  Tên: ${order.customerName}
  SĐT: ${order.customerPhone}
  ${order.customerEmail ? `Email: ${order.customerEmail}` : ''}
  Địa chỉ: ${order.customerAddress}

📦 *Sản phẩm:*
${itemsList}

💰 *Tổng cộng:* ${formatPrice(order.total)}

💳 *Thanh toán:* ${order.paymentMethod || 'Chưa xác định'}

⏰ ${new Date().toLocaleString('vi-VN')}
`.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return false;
  }
}
