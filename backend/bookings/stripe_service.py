"""
BigWatts Stripe service layer.
All Stripe interaction is isolated here — no hardcoded keys.

Requires env vars:
  STRIPE_SECRET_KEY     - sk_test_... or sk_live_...
  STRIPE_WEBHOOK_SECRET - whsec_...

Platform commission is configurable via PLATFORM_FEE_PERCENT (default: 5%).
Deposit percent is configurable via DEPOSIT_PERCENT (default: 30%).
"""
import logging
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)

# Lazy import so the app works without stripe installed (graceful degradation)
try:
    import stripe
    stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
    STRIPE_AVAILABLE = bool(stripe.api_key)
except ImportError:
    stripe = None
    STRIPE_AVAILABLE = False
    logger.warning("Stripe SDK not installed. Payment features disabled.")

DEPOSIT_PERCENT = int(getattr(settings, 'DEPOSIT_PERCENT', 30))
PLATFORM_FEE_PERCENT = int(getattr(settings, 'PLATFORM_FEE_PERCENT', 5))


def calculate_deposit(quoted_price):
    """Calculate deposit amount from quoted price (default 30%)."""
    if not quoted_price:
        return Decimal('0')
    return round(Decimal(str(quoted_price)) * DEPOSIT_PERCENT / 100, 2)


def calculate_platform_fee(amount):
    """Calculate platform fee from payment amount (default 5%)."""
    return round(Decimal(str(amount)) * PLATFORM_FEE_PERCENT / 100, 2)


def create_payment_intent(amount_eur, metadata=None):
    """
    Create a Stripe PaymentIntent in test mode.
    Returns (client_secret, payment_intent_id) or raises.
    """
    if not STRIPE_AVAILABLE:
        # Return mock data for dev/demo without Stripe keys
        import uuid
        mock_id = f"pi_mock_{uuid.uuid4().hex[:16]}"
        return f"mock_secret_{mock_id}", mock_id

    intent = stripe.PaymentIntent.create(
        amount=int(amount_eur * 100),  # cents
        currency='eur',
        metadata=metadata or {},
        automatic_payment_methods={'enabled': True},
    )
    return intent.client_secret, intent.id


def confirm_payment_intent(payment_intent_id):
    """Check if a PaymentIntent has been paid."""
    if not STRIPE_AVAILABLE or payment_intent_id.startswith('pi_mock_'):
        return True  # Mock: always paid in dev

    intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    return intent.status == 'succeeded'


def verify_webhook_signature(payload, sig_header):
    """Verify Stripe webhook signature. Returns the event or None."""
    if not STRIPE_AVAILABLE:
        return None

    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return None

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        return event
    except (stripe.error.SignatureVerificationError, ValueError) as e:
        logger.error(f"Webhook signature verification failed: {e}")
        return None
