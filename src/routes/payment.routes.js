import express from "express";
import Stripe from "stripe";
import { Artwork, Transaction, User } from "../models/index.js";

const tierLimits = {
  free: 3,
  pro: 9,
  premium: Infinity
};

const tierPrices = {
  pro: 9.99,
  premium: 19.99
};

export function paymentRoutes({ requireAuth }) {
  const router = express.Router();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe =
    stripeKey && !stripeKey.startsWith("sk_test_add")
      ? new Stripe(stripeKey)
      : null;

  const priceCache = new Map(); // tier -> Stripe Price id, reused across requests

  async function getOrCreatePrice(tier) {
    if (priceCache.has(tier)) return priceCache.get(tier);

    const lookupKey = `arthub_${tier}_monthly`;
    const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    if (existing.data.length > 0) {
      priceCache.set(tier, existing.data[0].id);
      return existing.data[0].id;
    }

    const product = await stripe.products.create({ name: `ArtHub ${tier} subscription` });
    const price = await stripe.prices.create({
      unit_amount: Math.round(tierPrices[tier] * 100),
      currency: "usd",
      recurring: { interval: "month" },
      product: product.id,
      lookup_key: lookupKey
    });

    priceCache.set(tier, price.id);
    return price.id;
  }

  async function fulfillCheckoutSession(session) {
    if (session.payment_status !== "paid") return;

    const transaction = await Transaction.findOne({ stripeSessionId: session.id });
    if (!transaction) {
      console.error(`Stripe webhook: no transaction found for session ${session.id}`);
      return;
    }

    if (transaction.status === "paid") return; // already fulfilled — idempotent

    transaction.status = "paid";
    await transaction.save();

    if (session.metadata?.type === "purchase") {
      const [artwork, buyer] = await Promise.all([
        Artwork.findById(transaction.artwork),
        User.findById(transaction.buyer)
      ]);
      if (artwork) artwork.status = "sold";
      if (buyer) buyer.purchaseCount = (buyer.purchaseCount || 0) + 1;
      await Promise.all([artwork?.save(), buyer?.save()].filter(Boolean));
    }

    if (session.metadata?.type === "subscription") {
      const user = await User.findById(transaction.buyer);
      if (user) {
        user.subscriptionTier = session.metadata.tier;
        await user.save();
      }
    }
  }

  async function handleSubscriptionLifecycleEvent(subscription) {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error(`Stripe webhook: subscription ${subscription.id} has no userId metadata`);
      return;
    }

    // Renewals/no-op transitions keep the tier already set at checkout completion.
    if (["active", "trialing"].includes(subscription.status)) return;

    const user = await User.findById(userId);
    if (user && user.subscriptionTier !== "free") {
      user.subscriptionTier = "free";
      await user.save();
    }
  }

  router.post("/purchase", requireAuth, async (req, res, next) => {
    try {
      const artwork = await Artwork.findById(req.body.artworkId).populate("artist", "name email");
      if (!artwork) return res.status(404).json({ message: "Artwork not found." });
      if (artwork.status === "sold") return res.status(400).json({ message: "Artwork is already sold." });
      if (String(artwork.artist._id) === String(req.user._id)) {
        return res.status(400).json({ message: "Artists cannot buy their own artwork." });
      }

      const maxPurchases = tierLimits[req.user.subscriptionTier] ?? tierLimits.free;
      if (req.user.purchaseCount >= maxPurchases) {
        return res.status(403).json({ message: "Upgrade your subscription to buy more artworks." });
      }

      const existingPending = await Transaction.findOne({
        artwork: artwork._id,
        type: "purchase",
        status: "pending"
      });
      if (existingPending) {
        if (stripe && existingPending.stripeSessionId) {
          const existingSession = await stripe.checkout.sessions.retrieve(existingPending.stripeSessionId);
          if (existingSession.status === "open") {
            return res.status(400).json({ message: "A checkout is already in progress for this artwork." });
          }
          await existingPending.deleteOne();
        } else {
          return res.status(400).json({ message: "A checkout is already in progress for this artwork." });
        }
      }

      if (!stripe) {
        if (process.env.NODE_ENV === "production") {
          return next(new Error("STRIPE_SECRET_KEY is missing or invalid. Refusing to process a purchase without real payment verification in production."));
        }

        const transaction = await Transaction.create({
          type: "purchase",
          artwork: artwork._id,
          buyer: req.user._id,
          artist: artwork.artist._id,
          amount: artwork.price,
          status: "paid"
        });

        artwork.status = "sold";
        req.user.purchaseCount += 1;
        await Promise.all([artwork.save(), req.user.save()]);

        return res.json({
          mode: "demo",
          message: "Stripe key missing. Demo purchase completed locally.",
          transaction
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: artwork.title },
              unit_amount: Math.round(artwork.price * 100)
            },
            quantity: 1
          }
        ],
        metadata: {
          type: "purchase",
          artworkId: String(artwork._id),
          buyerId: String(req.user._id),
          artistId: String(artwork.artist._id)
        }
      });

      await Transaction.create({
        type: "purchase",
        stripeSessionId: session.id,
        artwork: artwork._id,
        buyer: req.user._id,
        artist: artwork.artist._id,
        amount: artwork.price,
        status: "pending"
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  });

  router.post("/subscribe", requireAuth, async (req, res, next) => {
    try {
      const { tier } = req.body;
      if (!["pro", "premium"].includes(tier)) {
        return res.status(400).json({ message: "Invalid subscription tier." });
      }

      if (!stripe) {
        if (process.env.NODE_ENV === "production") {
          return next(new Error("STRIPE_SECRET_KEY is missing or invalid. Refusing to process a subscription without real payment verification in production."));
        }

        req.user.subscriptionTier = tier;
        await req.user.save();

        const transaction = await Transaction.create({
          type: "subscription",
          buyer: req.user._id,
          subscriptionTier: tier,
          amount: tierPrices[tier],
          status: "paid"
        });

        return res.json({
          mode: "demo",
          message: "Stripe key missing. Subscription upgraded locally.",
          user: req.user,
          transaction
        });
      }

      const priceId = await getOrCreatePrice(tier);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          type: "subscription",
          userId: String(req.user._id),
          tier
        },
        subscription_data: {
          metadata: {
            userId: String(req.user._id),
            tier
          }
        }
      });

      await Transaction.create({
        type: "subscription",
        stripeSessionId: session.id,
        buyer: req.user._id,
        subscriptionTier: tier,
        amount: tierPrices[tier],
        status: "pending"
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  });

  router.post("/verify", requireAuth, async (req, res, next) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: "Invalid request." });

      const transaction = await Transaction.findOne({ stripeSessionId: sessionId });
      if (!transaction) return res.status(404).json({ message: "Transaction not found." });

      if (String(transaction.buyer) !== String(req.user._id)) {
        return res.status(403).json({ message: "Unauthorized." });
      }

      // Source of truth is the webhook; this just reports current DB state
      // so the frontend can poll after redirect instead of driving the update itself.
      res.json({
        verified: transaction.status === "paid",
        status: transaction.status
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe || !webhookSecret) {
      return res.status(503).json({ message: "Stripe webhook is not configured." });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err.message);
      return res.status(400).json({ message: "Webhook signature verification failed." });
    }

    if (event.type === "checkout.session.completed") {
      try {
        await fulfillCheckoutSession(event.data.object);
      } catch (err) {
        console.error("Stripe webhook fulfillment failed:", err);
        return res.status(500).json({ message: "Webhook handler failed." });
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      try {
        await handleSubscriptionLifecycleEvent(event.data.object);
      } catch (err) {
        console.error("Stripe webhook subscription-lifecycle handling failed:", err);
        return res.status(500).json({ message: "Webhook handler failed." });
      }
    }

    res.json({ received: true });
  });

  return router;
}
