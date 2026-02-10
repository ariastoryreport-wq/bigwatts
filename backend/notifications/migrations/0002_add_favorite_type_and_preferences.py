from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('notifications', '0001_initial'),
    ]

    operations = [
        # Expand notification_type choices (no schema change needed for CharField)
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('quote_request', 'Demande de devis'),
                    ('quote_response', 'Réponse devis'),
                    ('new_message', 'Nouveau message'),
                    ('new_review', 'Nouvel avis'),
                    ('ticket_update', 'Mise à jour ticket'),
                    ('favorite', 'Favori'),
                    ('system', 'Système'),
                ],
                max_length=30,
            ),
        ),
        # Create NotificationPreference model
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_quotes', models.BooleanField(default=True, help_text='Recevoir les notifications de devis')),
                ('email_messages', models.BooleanField(default=True, help_text='Recevoir les notifications de messages')),
                ('email_reviews', models.BooleanField(default=True, help_text="Recevoir les notifications d'avis")),
                ('email_favorites', models.BooleanField(default=True, help_text='Recevoir les notifications de favoris')),
                ('email_system', models.BooleanField(default=True, help_text='Recevoir les notifications système')),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_preferences',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
