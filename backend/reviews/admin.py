from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('author', 'provider', 'rating', 'title', 'is_verified', 'created_at')
    list_filter = ('rating', 'is_verified')
    search_fields = ('author__username', 'provider__username', 'title', 'comment')
