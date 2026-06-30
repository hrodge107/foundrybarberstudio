const PUBLIC_KEY = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY || 'pk_test_placeholder';

export async function createGCashSource(amountPhp: number, bookingId: string): Promise<string> {
  const amountCents = Math.round(amountPhp * 100);

  const authHeader = 'Basic ' + btoa(PUBLIC_KEY + ':');

  const response = await fetch('https://api.paymongo.com/v1/sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCents,
          redirect: {
            success: window.location.origin + '/#/track?id=' + bookingId + '&payment=success',
            failed: window.location.origin + '/#/track?id=' + bookingId + '&payment=failed',
          },
          type: 'gcash',
          currency: 'PHP',
        },
      },
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.errors?.[0]?.detail || 'Failed to create GCash payment source';
    throw new Error(errMsg);
  }

  const json = await response.json();
  const checkoutUrl = json.data?.attributes?.redirect?.checkout_url;

  if (!checkoutUrl) {
    throw new Error('Checkout URL not returned from PayMongo API');
  }

  return checkoutUrl;
}
