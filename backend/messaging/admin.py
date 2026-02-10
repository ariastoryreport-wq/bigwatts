from django.contrib import admin
from .models import Conversation, Message, BlockedUser, Report, ModerationLog


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('sender', 'content', 'is_read', 'created_at')


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'ad', 'created_at', 'updated_at')
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'conversation', 'content_preview', 'is_read', 'created_at')
    list_filter = ('is_read',)

    def content_preview(self, obj):
        return obj.content[:80]


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    list_filter = ('created_at',)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'reported_user', 'reason', 'content_type', 'status', 'priority_score', 'created_at')
    list_filter = ('reason', 'status', 'content_type', 'priority_score')
    search_fields = ('reporter__username', 'reported_user__username', 'details')


@admin.register(ModerationLog)
class ModerationLogAdmin(admin.ModelAdmin):
    list_display = ('admin', 'action_type', 'target_user', 'report', 'created_at')
    list_filter = ('action_type', 'created_at')
    readonly_fields = ('admin', 'report', 'action_type', 'target_user', 'target_content_id', 'notes', 'created_at')
