from django.contrib import admin
from .models import Ticket, TicketResponse


class TicketResponseInline(admin.StackedInline):
    model = TicketResponse
    extra = 0


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject', 'created_by', 'assigned_to', 'category', 'priority', 'status', 'created_at')
    list_filter = ('status', 'priority', 'category')
    search_fields = ('subject', 'description')
    inlines = [TicketResponseInline]


@admin.register(TicketResponse)
class TicketResponseAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'author', 'is_internal', 'created_at')
