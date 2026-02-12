from .models import Notification, NotificationPreference


# Map notification_type → preference field
_TYPE_TO_PREF = {
    'quote_request': 'email_quotes',
    'quote_response': 'email_quotes',
    'new_message': 'email_messages',
    'new_review': 'email_reviews',
    'favorite': 'email_favorites',
    'ticket_update': 'email_system',
    'system': 'email_system',
}


def create_notification(*, recipient, notification_type, title, message, link=''):
    """Create a notification only if the user's preferences allow it.

    Usage (drop-in replacement for Notification.objects.create):
        from notifications.utils import create_notification
        create_notification(
            recipient=user,
            notification_type='favorite',
            title='...',
            message='...',
            link='/dashboard',
        )
    """
    pref_field = _TYPE_TO_PREF.get(notification_type)
    if pref_field:
        try:
            prefs = NotificationPreference.objects.get(user=recipient)
            if not getattr(prefs, pref_field, True):
                # User opted out of this notification type
                return None
        except NotificationPreference.DoesNotExist:
            # No preferences record → default is to send everything
            pass

    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
    )
