# Generated migration for bookings app

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ads', '0003_add_geo'),
    ]

    operations = [
        migrations.CreateModel(
            name='AvailabilitySlot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start', models.DateTimeField()),
                ('end', models.DateTimeField()),
                ('is_booked', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('provider', models.ForeignKey(
                    limit_choices_to={'role': 'prestataire'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='availability_slots',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['start'],
            },
        ),
        migrations.CreateModel(
            name='Booking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'En attente'),
                        ('confirmed', 'Confirmé'),
                        ('deposit_paid', 'Acompte payé'),
                        ('in_progress', 'En cours'),
                        ('completed', 'Terminé'),
                        ('cancelled', 'Annulé'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('homeowner', models.ForeignKey(
                    limit_choices_to={'role': 'proprietaire'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='bookings_as_owner',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('provider', models.ForeignKey(
                    limit_choices_to={'role': 'prestataire'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='bookings_as_provider',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('quote', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='booking',
                    to='ads.quoterequest',
                )),
                ('slot', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='booking',
                    to='bookings.availabilityslot',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stripe_payment_intent_id', models.CharField(blank=True, db_index=True, max_length=255)),
                ('amount', models.DecimalField(
                    decimal_places=2,
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('platform_fee', models.DecimalField(
                    decimal_places=2,
                    default=0,
                    max_digits=10,
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('payment_type', models.CharField(
                    choices=[('deposit', 'Acompte'), ('final', 'Solde final')],
                    default='deposit',
                    max_length=10,
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'En attente'),
                        ('paid', 'Payé'),
                        ('failed', 'Échoué'),
                        ('refunded', 'Remboursé'),
                    ],
                    default='pending',
                    max_length=10,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='payments',
                    to='bookings.booking',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
