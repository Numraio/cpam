import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import type { NextApiRequest, NextApiResponse } from 'next';
import env from '@/lib/env';
import type { Readable } from 'node:stream';
import {
  createStripeSubscription,
  deleteStripeSubscription,
  getBySubscriptionId,
  updateStripeSubscription,
} from 'models/subscription';
import { getByCustomerId } from 'models/team';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Get raw body as string
async function getRawBody(readable: Readable): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

const relevantEvents: Stripe.Event.Type[] = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = await getRawBody(req);

  const sig = req.headers['stripe-signature'] as string;
  const { webhookSecret } = env.stripe;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      return;
    }
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).json({ error: { message: err.message } });
  }

  if (relevantEvents.includes(event.type)) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await deleteStripeSubscription(
            (event.data.object as Stripe.Subscription).id
          );
          break;
        default:
          throw new Error('Unhandled relevant event!');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return res.status(400).json({
        error: {
          message: 'Webhook handler failed. View your nextjs function logs.',
        },
      });
    }
  }
  return res.status(200).json({ received: true });
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const {
    cancel_at,
    id,
    status,
    current_period_end,
    current_period_start,
    customer,
    items,
    metadata,
  } = event.data.object as Stripe.Subscription;

  const subscription = await getBySubscriptionId(id);
  if (!subscription) {
    const teamExists = await getByCustomerId(customer as string);
    if (!teamExists) {
      return;
    } else {
      await handleSubscriptionCreated(event);
    }
  } else {
    const priceId = items.data.length > 0 ? items.data[0].plan?.id : '';

    // Extract entitlements from metadata or price
    const maxIuM = extractMaxIuM(metadata, priceId);

    //type Stripe.Subscription.Status = "active" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "paused" | "trialing" | "unpaid"
    await updateStripeSubscription(id, {
      active: status === 'active',
      endDate: current_period_end
        ? new Date(current_period_end * 1000)
        : undefined,
      startDate: current_period_start
        ? new Date(current_period_start * 1000)
        : undefined,
      cancelAt: cancel_at ? new Date(cancel_at * 1000) : undefined,
      priceId,
      maxItemsUnderManagement: maxIuM,
    });
  }
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const { customer, id, current_period_start, current_period_end, items, metadata } =
    event.data.object as Stripe.Subscription;

  const priceId = items.data.length > 0 ? items.data[0].plan?.id : '';
  const maxIuM = extractMaxIuM(metadata, priceId);

  await createStripeSubscription({
    customerId: customer as string,
    id,

    active: true,
    startDate: new Date(current_period_start * 1000),
    endDate: new Date(current_period_end * 1000),
    priceId,
    maxItemsUnderManagement: maxIuM,
  });
}

/**
 * Extract max IuM from subscription metadata or price
 *
 * Priority:
 * 1. subscription.metadata.maxItemsUnderManagement
 * 2. Hardcoded price ID mappings
 * 3. Default (100)
 */
function extractMaxIuM(
  metadata: Stripe.Metadata | undefined,
  priceId: string | undefined
): number | null {
  // Check metadata first
  if (metadata?.maxItemsUnderManagement) {
    const limit = parseInt(metadata.maxItemsUnderManagement, 10);
    if (!isNaN(limit)) {
      return limit === -1 ? null : limit; // -1 = unlimited
    }
  }

  // Fallback to hardcoded price mappings (can be env vars)
  const priceLimits: Record<string, number | null> = {
    // Example price IDs (replace with actual Stripe price IDs)
    'price_free': 100,
    'price_starter': 1000,
    'price_professional': 10000,
    'price_enterprise': null, // unlimited
  };

  if (priceId && priceLimits[priceId] !== undefined) {
    return priceLimits[priceId];
  }

  // Default
  return 100;
}
