"""
BigWatts email notification helpers.
Uses Django's email backend (console in dev, SMTP/SendGrid in production).
Configure via env vars: EMAIL_BACKEND, EMAIL_HOST, EMAIL_HOST_USER, etc.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


def send_notification_email(recipient_email, subject, message, html_message=None):
    """Send a transactional email. Fails silently in case of errors."""
    try:
        send_mail(
            subject=f'BigWatts — {subject}',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=True,
        )
        logger.info(f'Email sent to {recipient_email}: {subject}')
    except Exception as e:
        logger.error(f'Email failed for {recipient_email}: {e}')


def notify_new_quote_request(quote):
    """Email provider when they receive a new quote request."""
    provider = quote.ad.provider
    if not provider.email:
        return
    send_notification_email(
        recipient_email=provider.email,
        subject='Nouvelle demande de devis',
        message=(
            f'Bonjour {provider.first_name or provider.username},\n\n'
            f'{quote.owner.get_full_name() or quote.owner.username} a demandé un devis '
            f'pour votre service "{quote.ad.title}".\n\n'
            f'Connectez-vous sur BigWatts pour répondre.\n\n'
            f'L\'équipe BigWatts'
        ),
    )


def notify_quote_response(quote):
    """Email owner when provider responds to their quote."""
    owner = quote.owner
    if not owner.email:
        return
    status_labels = {
        'accepted': 'acceptée',
        'declined': 'refusée',
        'completed': 'terminée',
    }
    label = status_labels.get(quote.status, quote.status)
    send_notification_email(
        recipient_email=owner.email,
        subject=f'Votre demande de devis a été {label}',
        message=(
            f'Bonjour {owner.first_name or owner.username},\n\n'
            f'Votre demande de devis pour "{quote.ad.title}" a été {label}.\n\n'
            f'{f"Prix proposé : {quote.quoted_price} €" if quote.quoted_price else ""}\n'
            f'{f"Message du prestataire : {quote.provider_response}" if quote.provider_response else ""}\n\n'
            f'Connectez-vous sur BigWatts pour plus de détails.\n\n'
            f'L\'équipe BigWatts'
        ),
    )


def notify_new_message(conversation, message):
    """Email user when they receive a new message."""
    recipient = message.recipient if hasattr(message, 'recipient') else None
    if not recipient or not recipient.email:
        return
    send_notification_email(
        recipient_email=recipient.email,
        subject='Nouveau message',
        message=(
            f'Bonjour {recipient.first_name or recipient.username},\n\n'
            f'Vous avez reçu un nouveau message de '
            f'{message.sender.get_full_name() or message.sender.username}.\n\n'
            f'Connectez-vous sur BigWatts pour lire et répondre.\n\n'
            f'L\'équipe BigWatts'
        ),
    )


def notify_new_review(review):
    """Email provider when they receive a new review."""
    provider = review.provider
    if not provider.email:
        return
    send_notification_email(
        recipient_email=provider.email,
        subject='Nouvel avis reçu',
        message=(
            f'Bonjour {provider.first_name or provider.username},\n\n'
            f'{review.author.get_full_name() or review.author.username} vous a laissé '
            f'un avis ({review.rating}/5) : "{review.title}"\n\n'
            f'Connectez-vous sur BigWatts pour lire et répondre.\n\n'
            f'L\'équipe BigWatts'
        ),
    )


def notify_appointment(appointment, action='created'):
    """Email both parties about an appointment."""
    for user in [appointment.provider, appointment.owner]:
        if not user.email:
            continue
        other = appointment.owner if user == appointment.provider else appointment.provider
        action_labels = {
            'created': 'Un nouveau rendez-vous a été proposé',
            'confirmed': 'Votre rendez-vous a été confirmé',
            'cancelled': 'Votre rendez-vous a été annulé',
        }
        send_notification_email(
            recipient_email=user.email,
            subject=action_labels.get(action, 'Mise à jour rendez-vous'),
            message=(
                f'Bonjour {user.first_name or user.username},\n\n'
                f'{action_labels.get(action, "Mise à jour")} avec '
                f'{other.get_full_name() or other.username} :\n\n'
                f'📅 {appointment.date} de {appointment.start_time} à {appointment.end_time}\n'
                f'📍 {appointment.location or "Lieu à définir"}\n'
                f'📝 {appointment.title}\n\n'
                f'Connectez-vous sur BigWatts pour plus de détails.\n\n'
                f'L\'équipe BigWatts'
            ),
        )
