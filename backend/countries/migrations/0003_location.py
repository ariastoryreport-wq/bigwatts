"""Add Location model for self-hosted geographic autocomplete."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('countries', '0002_seed_fr_ca'),
    ]

    operations = [
        migrations.CreateModel(
            name='Location',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('country_code', models.CharField(db_index=True, help_text='ISO country code (CA, FR…)', max_length=5)),
                ('city_name', models.CharField(help_text='City / municipality name', max_length=150)),
                ('postal_code', models.CharField(blank=True, help_text='Postal code or FSA (e.g. H2X)', max_length=10)),
                ('region_name', models.CharField(blank=True, help_text='Province / region name', max_length=100)),
                ('region_code', models.CharField(blank=True, help_text='Province / region code (QC, ON…)', max_length=10)),
                ('population', models.PositiveIntegerField(default=0, help_text='Population for sort priority')),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-population', 'city_name'],
                'indexes': [
                    models.Index(fields=['country_code', 'city_name'], name='loc_country_city'),
                    models.Index(fields=['country_code', 'postal_code'], name='loc_country_postal'),
                    models.Index(fields=['country_code', 'region_code'], name='loc_country_region'),
                ],
            },
        ),
    ]
