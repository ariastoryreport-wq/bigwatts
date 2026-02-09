"""Add latitude/longitude to Ad model."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ads', '0002_add_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='ad',
            name='latitude',
            field=models.FloatField(blank=True, help_text='Latitude GPS', null=True),
        ),
        migrations.AddField(
            model_name='ad',
            name='longitude',
            field=models.FloatField(blank=True, help_text='Longitude GPS', null=True),
        ),
    ]
