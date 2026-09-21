import express from 'express';
export function registerBillingWebhook(app, { pool, stripe, stripeWebhookSecret, recordOpsEvent, upsertSubscriptionFromStripe, trackGrowthEvent }) {
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret) return res.status(501).json({ error: 'Stripe is not configured.' });
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe signature.' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (error) {
    void recordOpsEvent('stripe_webhook_rejected', 'warn', error.message, { reason: 'signature' }, req.requestId);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    const received = await pool.query('INSERT INTO stripe_webhook_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING', [event.id, event.type]);
    if (!received.rowCount) return res.json({ received: true, duplicate: true });
    const object = event.data?.object;
    if (event.type === 'checkout.session.completed') {
      const accountId = object?.metadata?.accountId;
      if (accountId) {
        await upsertSubscriptionFromStripe({
          accountId,
          plan: object?.metadata?.plan || 'family',
          status: 'active',
          customerId: object?.customer || null,
          subscriptionId: object?.subscription || null,
        });
        await trackGrowthEvent(accountId, 'plan_selected', { plan: object?.metadata?.plan || 'family', status: 'active', source: 'stripe_checkout' });
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = object;
      const customerId = subscription?.customer;
      if (customerId) {
        const accountRes = await pool.query('SELECT id FROM accounts WHERE id = (SELECT account_id FROM subscriptions WHERE provider_customer_id = $1 ORDER BY updated_at DESC LIMIT 1)', [String(customerId)]);
        const accountId = accountRes.rows?.[0]?.id;
        if (accountId) {
          const active = ['active', 'trialing', 'past_due'].includes(subscription?.status);
          await upsertSubscriptionFromStripe({
            accountId,
            plan: subscription?.metadata?.plan || 'family',
            status: active ? 'active' : 'canceled',
            customerId: String(customerId),
            subscriptionId: subscription?.id || null,
          });
        }
      }
    }

    await pool.query("UPDATE stripe_webhook_events SET status = 'processed', processed_at = NOW() WHERE event_id = $1", [event.id]);
    return res.json({ received: true });
  } catch (error) {
    await pool.query("UPDATE stripe_webhook_events SET status = 'failed', error_message = $2 WHERE event_id = $1", [event?.id, error.message]);
    void recordOpsEvent('stripe_webhook_failed', 'error', error.message, { eventType: event?.type }, req.requestId);
    return res.status(500).json({ error: 'Webhook handler failed.' });
  }
});
}
