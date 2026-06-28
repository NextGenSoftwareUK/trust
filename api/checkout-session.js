const Stripe = require('stripe');
const { getBearerToken } = require('./_oasis');

const TRUST_DEED_PRICE_PENCE = 11100; // £111.00

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return new Stripe(key);
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const { trustId, trustName, avatarId } = req.body || {};
  if (!trustId || !avatarId) {
    return res.status(400).json({ error: 'trustId and avatarId are required.' });
  }

  try {
    const stripe = getStripe();
    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: TRUST_DEED_PRICE_PENCE,
            product_data: {
              name: `Express Trust Deed Package — ${trustName || 'Trust Deed'}`,
              description: 'PDF Trust Deed + Dashboard Access'
            }
          },
          quantity: 1
        }
      ],
      metadata: { trustId, avatarId },
      success_url: `${origin}/downloads.html?id=${encodeURIComponent(trustId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html?id=${encodeURIComponent(trustId)}`
    });

    return res.status(200).json({ success: true, url: session.url });

  } catch (err) {
    console.error('[checkout-session]', err);
    return res.status(500).json({ error: err.message || 'Failed to start checkout. Please try again.' });
  }
};
