"""
Management command to expire certifications past their expiration_date.
Run daily via cron: python manage.py check_certification_expiry
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Certification, CertificationStatusLog


class Command(BaseCommand):
    help = 'Expire approved certifications past their expiration date.'

    def handle(self, *args, **options):
        today = timezone.now().date()
        expired = Certification.objects.filter(
            status=Certification.Status.APPROVED,
            expiration_date__lt=today,
        )
        count = expired.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No certifications to expire.'))
            return

        for cert in expired:
            old_status = cert.status
            cert.status = Certification.Status.EXPIRED
            cert.save(update_fields=['status', 'updated_at'])

            CertificationStatusLog.objects.create(
                certification=cert,
                old_status=old_status,
                new_status=Certification.Status.EXPIRED,
                changed_by=None,
                notes=f'Expiration automatique — date d\'expiration : {cert.expiration_date}',
            )

            # Notify provider
            try:
                from notifications.utils import create_notification
                create_notification(
                    recipient=cert.user,
                    notification_type='certification_expired',
                    title='Certification expirée',
                    message=f'Votre certification "{cert.certification_name}" a expiré. Veuillez la renouveler.',
                    link='/dashboard/profile',
                )
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(f'Expired {count} certification(s).'))
