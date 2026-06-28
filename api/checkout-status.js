const Stripe = require('stripe');

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(key);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query || {};
  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required.' });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    return res.status(200).json({
      success: true,
      paid: session.payment_status === 'paid',
      trustId: session.metadata?.trustId || null,
      avatarId: session.metadata?.avatarId || null,
      amountTotal: session.amount_total,
      currency: session.currency
    });

  } catch (err) {
    console.error('[checkout-status]', err);
    return res.status(400).json({ error: 'Could not verify payment status.' });
  }
};
