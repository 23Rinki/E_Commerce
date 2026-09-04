// Builds a upi://pay deep link so scanning the receipt's QR in any UPI app
// (GPay/PhonePe/Paytm) opens a payment already filled in with the real amount.
export function buildUpiUri(upiId: string, payeeName: string, amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || 'Store',
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
