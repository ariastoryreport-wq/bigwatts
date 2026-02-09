"""Add latitude/longitude, ProviderBadge, UserBadge, Appointment models."""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('ads', '0002_add_image_url'),
    ]

    operations = [
        # Geolocation on User
        migrations.AddField(
            model_name='user',
            name='latitude',
            field=models.FloatField(blank=True, help_text='Latitude GPS', null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='longitude',
            field=models.FloatField(blank=True, help_text='Longitude GPS', null=True),
        ),

        # Badge definitions
        migrations.CreateModel(
            name='ProviderBadge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(unique=True)),
                ('description', models.TextField(blank=True)),
                ('badge_type', models.CharField(
                    choices=[('certification', 'Certification'), ('achievement', 'Réalisation'),
                             ('quality', 'Qualité'), ('trust', 'Confiance')],
                    default='certification', max_length=20)),
                ('icon', models.CharField(default='award', help_text='Lucide icon name', max_length=50)),
                ('color', models.CharField(default='brand', help_text='Color theme: brand, gold, blue, green', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['name']},
        ),

        # User ↔ Badge link
        migrations.CreateModel(
            name='UserBadge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('awarded_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('badge', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='holders', to='accounts.providerbadge')),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='badges', to=settings.AUTH_USER_MODEL)),
                ('awarded_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='badges_awarded', to=settings.AUTH_USER_MODEL,
                    limit_choices_to={'role': 'customer_service'})),
            ],
            options={
                'ordering': ['-awarded_at'],
                'unique_together': {('user', 'badge')},
            },
        ),

        # Appointment
        migrations.CreateModel(
            name='Appointment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('date', models.DateField()),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('location', models.CharField(blank=True, max_length=300)),
                ('status', models.CharField(
                    choices=[('pending', 'En attente'), ('confirmed', 'Confirmé'),
                             ('cancelled', 'Annulé'), ('completed', 'Terminé')],
                    default='pending', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('provider', models.ForeignKey(
                    limit_choices_to={'role': 'prestataire'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='provider_appointments', to=settings.AUTH_USER_MODEL)),
                ('owner', models.ForeignKey(
                    limit_choices_to={'role': 'proprietaire'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='owner_appointments', to=settings.AUTH_USER_MODEL)),
                ('quote_request', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='appointments', to='ads.quoterequest')),
            ],
            options={'ordering': ['date', 'start_time']},
        ),
    ]
