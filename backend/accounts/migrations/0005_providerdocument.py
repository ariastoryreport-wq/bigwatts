from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_add_country_fk'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProviderDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('doc_type', models.CharField(choices=[
                    ('identity', "Pièce d'identité"),
                    ('rge', 'Certification RGE'),
                    ('insurance', 'Assurance décennale'),
                    ('qualipv', 'QualiPV / QualiBois'),
                    ('kbis', 'Extrait Kbis'),
                    ('other', 'Autre'),
                ], max_length=20)),
                ('label', models.CharField(max_length=200)),
                ('file_url', models.URLField(blank=True, help_text='URL du document (stockage externe)', max_length=500)),
                ('file_name', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[
                    ('pending', 'En attente de vérification'),
                    ('approved', 'Approuvé'),
                    ('rejected', 'Refusé'),
                ], default='pending', max_length=20)),
                ('reviewer_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('provider', models.ForeignKey(
                    limit_choices_to={'role': 'prestataire'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='documents',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True, null=True,
                    limit_choices_to={'role': 'customer_service'},
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reviewed_documents',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
