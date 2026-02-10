from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone

from .models import Conversation, Message, BlockedUser, Report, ModerationLog
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer, SendMessageSerializer
)
from accounts.permissions import IsCustomerService

User = get_user_model()


# ──────────── Heartbeat / Online ────────────

class HeartbeatView(APIView):
    """POST /api/messaging/heartbeat/ — update last_seen for online status."""

    def post(self, request):
        User.objects.filter(pk=request.user.pk).update(last_seen=timezone.now())
        return Response({'ok': True})


class UserOnlineStatusView(APIView):
    """GET /api/messaging/online/<user_id>/ — check if a specific user is online."""

    def get(self, request, user_id):
        try:
            u = User.objects.get(pk=user_id)
            return Response({'user_id': u.id, 'is_online': u.is_online})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


# ──────────── Conversations ────────────

class ConversationListView(generics.ListAPIView):
    """GET /api/messaging/conversations/ - User's conversations."""
    serializer_class = ConversationListSerializer

    def get_queryset(self):
        blocked_ids = BlockedUser.objects.filter(
            blocker=self.request.user
        ).values_list('blocked_id', flat=True)
        return Conversation.objects.filter(
            participants=self.request.user
        ).exclude(
            participants__in=blocked_ids
        ).prefetch_related('participants', 'messages').distinct()


class ConversationDetailView(generics.RetrieveAPIView):
    """GET /api/messaging/conversations/<id>/ - Conversation messages."""
    serializer_class = ConversationDetailSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        # Mark messages as read
        conversation.messages.filter(is_read=False).exclude(
            sender=request.user
        ).update(is_read=True)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)


class ConversationPollView(APIView):
    """
    GET /api/messaging/conversations/<id>/poll/?after=<msg_id>
    Lightweight polling endpoint: returns only new messages since a given ID.
    Also marks incoming messages as read and returns participant online status.
    """

    def get(self, request, pk):
        try:
            conversation = Conversation.objects.filter(
                pk=pk, participants=request.user
            ).prefetch_related('participants').get()
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        after_id = request.query_params.get('after')
        if after_id:
            try:
                after_id = int(after_id)
            except (ValueError, TypeError):
                after_id = 0
        else:
            after_id = 0

        new_messages = Message.objects.filter(
            conversation=conversation,
            id__gt=after_id,
        ).select_related('sender').order_by('created_at')

        # Mark incoming messages as read
        new_messages.filter(is_read=False).exclude(
            sender=request.user
        ).update(is_read=True)

        messages_data = MessageSerializer(new_messages, many=True).data

        # Include IDs of messages sent by current user that were read
        read_ids = list(
            Message.objects.filter(
                conversation=conversation,
                sender=request.user,
                is_read=True,
            ).values_list('id', flat=True)
        )

        # Participant online status
        other = conversation.participants.exclude(pk=request.user.pk).first()
        other_online = other.is_online if other else False

        return Response({
            'messages': messages_data,
            'has_new': len(messages_data) > 0,
            'other_online': other_online,
            'read_ids': read_ids,
        })


class UnreadTotalView(APIView):
    """
    GET /api/messaging/unread-total/
    Returns total unread message count across all user's conversations.
    """

    def get(self, request):
        total = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False,
        ).exclude(sender=request.user).count()
        return Response({'unread_count': total})


class SendMessageView(APIView):
    """POST /api/messaging/send/ - Send a message (create or find conversation)."""

    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient_id = serializer.validated_data.get('recipient_id')
        ad_id = serializer.validated_data.get('ad_id')
        content = serializer.validated_data['content']

        if not recipient_id:
            return Response({'error': 'recipient_id est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            recipient = User.objects.get(pk=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Destinataire introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if recipient == request.user:
            return Response({'error': 'Vous ne pouvez pas vous envoyer un message.'}, status=status.HTTP_400_BAD_REQUEST)

        # Role-based restrictions
        sender_role = request.user.role
        recipient_role = recipient.role
        if sender_role == 'proprietaire' and recipient_role != 'prestataire':
            return Response({'error': 'Vous ne pouvez contacter que des prestataires.'}, status=status.HTTP_403_FORBIDDEN)
        if sender_role == 'prestataire' and recipient_role != 'proprietaire':
            return Response({'error': 'Vous ne pouvez répondre qu\'aux propriétaires.'}, status=status.HTTP_403_FORBIDDEN)

        # Check if blocked
        if BlockedUser.objects.filter(blocker=recipient, blocked=request.user).exists():
            return Response({'error': 'Vous ne pouvez pas contacter cet utilisateur.'}, status=status.HTTP_403_FORBIDDEN)

        # Find existing conversation or create new one
        conversation = None
        user_conversations = Conversation.objects.filter(
            participants=request.user
        ).filter(participants=recipient)

        if ad_id:
            conversation = user_conversations.filter(ad_id=ad_id).first()
        if not conversation:
            # Fall back to any conversation with this user
            conversation = user_conversations.first()

        is_first_message = conversation is None

        if not conversation:
            from ads.models import Ad
            conversation = Conversation.objects.create(
                ad_id=ad_id if ad_id else None
            )
            conversation.participants.add(request.user, recipient)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )

        conversation.save()  # Update updated_at

        # Create notification
        from notifications.models import Notification
        Notification.objects.create(
            recipient=recipient,
            notification_type='new_message',
            title='Nouveau message',
            message=f'{request.user.get_full_name() or request.user.username} vous a envoyé un message.',
            link=f'/dashboard/messages/{conversation.pk}'
        )

        data = MessageSerializer(message).data
        data['is_first_message'] = is_first_message
        data['conversation_id'] = conversation.pk

        return Response(data, status=status.HTTP_201_CREATED)


class ConversationMessagesView(generics.ListCreateAPIView):
    """GET/POST /api/messaging/conversations/<id>/messages/ - Messages in a conversation."""
    serializer_class = MessageSerializer
    pagination_class = None

    def get_queryset(self):
        return Message.objects.filter(
            conversation_id=self.kwargs['pk'],
            conversation__participants=self.request.user
        )

    def perform_create(self, serializer):
        conversation = Conversation.objects.get(
            pk=self.kwargs['pk'],
            participants=self.request.user
        )

        # Check if blocked
        other = conversation.participants.exclude(pk=self.request.user.pk).first()
        if other and BlockedUser.objects.filter(blocker=other, blocked=self.request.user).exists():
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Vous ne pouvez pas envoyer de message dans cette conversation.')

        message = serializer.save(sender=self.request.user, conversation=conversation)
        conversation.save()  # Update updated_at

        # Notify other participants
        from notifications.models import Notification
        for participant in conversation.participants.exclude(pk=self.request.user.pk):
            Notification.objects.create(
                recipient=participant,
                notification_type='new_message',
                title='Nouveau message',
                message=f'{self.request.user.get_full_name() or self.request.user.username} vous a envoyé un message.',
                link=f'/dashboard/messages/{conversation.pk}'
            )


# ──────────── Block / Report ────────────

class BlockUserView(APIView):
    """POST /api/messaging/block/ — block a user."""

    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if target == request.user:
            return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)

        _, created = BlockedUser.objects.get_or_create(blocker=request.user, blocked=target)
        return Response({'status': 'blocked' if created else 'already_blocked'})


class UnblockUserView(APIView):
    """POST /api/messaging/unblock/ — unblock a user."""

    def post(self, request):
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id requis.'}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = BlockedUser.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        return Response({'status': 'unblocked' if deleted else 'not_blocked'})


class BlockedListView(APIView):
    """GET /api/messaging/blocked/ — list blocked users."""

    def get(self, request):
        blocked = BlockedUser.objects.filter(blocker=request.user).select_related('blocked')
        data = [
            {
                'id': b.blocked.id,
                'username': b.blocked.username,
                'first_name': b.blocked.first_name,
                'last_name': b.blocked.last_name,
                'blocked_at': b.created_at,
            }
            for b in blocked
        ]
        return Response(data)


class ReportUserView(APIView):
    """POST /api/messaging/report/ — report a user, message, or ad."""

    def post(self, request):
        user_id = request.data.get('user_id')
        reason = request.data.get('reason', 'other')
        details = request.data.get('details', '')
        conversation_id = request.data.get('conversation_id')
        content_type = request.data.get('content_type', 'message')
        content_id = request.data.get('content_id')

        if not user_id:
            return Response({'error': 'user_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if target == request.user:
            return Response({'error': 'Vous ne pouvez pas vous signaler.'}, status=status.HTTP_400_BAD_REQUEST)

        # Rate limiting: prevent duplicate reports from same reporter on same target within 24h
        from datetime import timedelta
        recent = Report.objects.filter(
            reporter=request.user,
            reported_user=target,
            created_at__gte=timezone.now() - timedelta(hours=24),
        )
        if content_type and content_id:
            recent = recent.filter(content_type=content_type, content_id=content_id)
        if recent.exists():
            return Response({'error': 'Vous avez déjà signalé cet élément récemment.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Calculate priority score based on unique reporters
        existing_reports_count = Report.objects.filter(
            reported_user=target,
            status__in=['pending', 'reviewing'],
        ).values('reporter').distinct().count()
        priority = min(existing_reports_count + 1, 10)

        report = Report.objects.create(
            reporter=request.user,
            reported_user=target,
            content_type=content_type,
            content_id=content_id,
            conversation_id=conversation_id,
            reason=reason,
            details=details,
            priority_score=priority,
        )

        # Auto-hide content if priority >= 3 (3+ unique reporters)
        if priority >= 3:
            Report.objects.filter(
                reported_user=target,
                status='pending',
            ).update(is_content_hidden=True)

        # Create notification to CS staff
        from notifications.models import Notification
        cs_users = User.objects.filter(role='customer_service')
        for cs in cs_users:
            Notification.objects.create(
                recipient=cs,
                notification_type='system',
                title='Nouveau signalement',
                message=f'{request.user.get_full_name() or request.user.username} a signalé {target.get_full_name() or target.username} ({report.get_reason_display()}).',
                link='/dashboard/cs/reports',
            )

        return Response({
            'status': 'reported',
            'message': 'Votre signalement a été enregistré. Notre équipe l\'examinera dans les plus brefs délais.',
        }, status=status.HTTP_201_CREATED)


# ──────────── CS Moderation ────────────

class CSReportListView(APIView):
    """GET /api/messaging/cs/reports/ — list all reports for CS moderation."""
    permission_classes = [IsCustomerService]

    def get(self, request):
        reports = Report.objects.select_related(
            'reporter', 'reported_user', 'conversation', 'resolved_by'
        ).all()

        # Filters
        report_status = request.query_params.get('status')
        reason = request.query_params.get('reason')
        content_type = request.query_params.get('content_type')

        if report_status:
            reports = reports.filter(status=report_status)
        if reason:
            reports = reports.filter(reason=reason)
        if content_type:
            reports = reports.filter(content_type=content_type)

        data = []
        for r in reports[:100]:
            context_data = None
            # Fetch context based on content type
            if r.content_type == 'message' and r.conversation_id:
                msgs = Message.objects.filter(
                    conversation_id=r.conversation_id,
                ).select_related('sender').order_by('-created_at')[:10]
                context_data = [{
                    'id': m.id,
                    'sender': m.sender.username,
                    'sender_name': m.sender.get_full_name(),
                    'content': m.content,
                    'created_at': m.created_at.isoformat(),
                } for m in reversed(msgs)]
            elif r.content_type == 'ad' and r.content_id:
                from ads.models import Ad
                try:
                    ad = Ad.objects.get(pk=r.content_id)
                    context_data = {'id': ad.id, 'title': ad.title, 'description': ad.description[:200]}
                except Ad.DoesNotExist:
                    context_data = None

            data.append({
                'id': r.id,
                'reporter': {
                    'id': r.reporter.id,
                    'username': r.reporter.username,
                    'name': r.reporter.get_full_name(),
                    'role': r.reporter.role,
                },
                'reported_user': {
                    'id': r.reported_user.id,
                    'username': r.reported_user.username,
                    'name': r.reported_user.get_full_name(),
                    'role': r.reported_user.role,
                    'reports_count': Report.objects.filter(reported_user=r.reported_user).count(),
                },
                'content_type': r.content_type,
                'content_id': r.content_id,
                'reason': r.reason,
                'reason_display': r.get_reason_display(),
                'details': r.details,
                'status': r.status,
                'status_display': r.get_status_display(),
                'priority_score': r.priority_score,
                'is_content_hidden': r.is_content_hidden,
                'admin_notes': r.admin_notes,
                'resolved_by': r.resolved_by.username if r.resolved_by else None,
                'resolved_at': r.resolved_at.isoformat() if r.resolved_at else None,
                'created_at': r.created_at.isoformat(),
                'context': context_data,
            })

        return Response(data)


class CSReportActionView(APIView):
    """POST /api/messaging/cs/reports/<id>/action/ — take moderation action."""
    permission_classes = [IsCustomerService]

    def post(self, request, pk):
        try:
            report = Report.objects.select_related('reported_user').get(pk=pk)
        except Report.DoesNotExist:
            return Response({'error': 'Signalement introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        notes = request.data.get('notes', '')

        valid_actions = ['dismiss', 'delete_content', 'hide_content', 'warn_user', 'suspend_user', 'ban_user']
        if action not in valid_actions:
            return Response({'error': f'Action invalide. Choix: {", ".join(valid_actions)}'}, status=status.HTTP_400_BAD_REQUEST)

        target = report.reported_user

        # Execute action
        if action == 'dismiss':
            report.status = 'dismissed'
        elif action == 'delete_content':
            if report.content_type == 'message' and report.content_id:
                Message.objects.filter(pk=report.content_id).delete()
            elif report.content_type == 'ad' and report.content_id:
                from ads.models import Ad
                Ad.objects.filter(pk=report.content_id).update(status='archived')
            report.status = 'resolved'
        elif action == 'hide_content':
            report.is_content_hidden = True
            report.status = 'resolved'
        elif action == 'warn_user':
            from notifications.models import Notification
            Notification.objects.create(
                recipient=target,
                notification_type='system',
                title='Avertissement de modération',
                message='Votre contenu a été signalé pour comportement inapproprié. Veuillez respecter les règles de la plateforme.',
                link='/dashboard',
            )
            report.status = 'resolved'
        elif action == 'suspend_user':
            target.is_active = False
            target.save(update_fields=['is_active'])
            report.status = 'resolved'
        elif action == 'ban_user':
            target.is_active = False
            target.save(update_fields=['is_active'])
            report.status = 'resolved'

        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.admin_notes = notes
        report.save()

        # Log moderation action
        ModerationLog.objects.create(
            admin=request.user,
            report=report,
            action_type=action,
            target_user=target,
            target_content_id=report.content_id,
            notes=notes,
        )

        # Resolve all pending reports for same target+content
        if action != 'dismiss':
            Report.objects.filter(
                reported_user=target,
                content_type=report.content_type,
                content_id=report.content_id,
                status='pending',
            ).exclude(pk=report.pk).update(
                status='resolved',
                resolved_by=request.user,
                resolved_at=timezone.now(),
                admin_notes=f'Résolu automatiquement via le signalement #{report.pk}',
            )

        return Response({
            'status': 'ok',
            'action': action,
            'report_status': report.status,
        })


class CSReportStatsView(APIView):
    """GET /api/messaging/cs/reports/stats/ — report statistics for dashboard."""
    permission_classes = [IsCustomerService]

    def get(self, request):
        total = Report.objects.count()
        pending = Report.objects.filter(status='pending').count()
        reviewing = Report.objects.filter(status='reviewing').count()
        high_priority = Report.objects.filter(priority_score__gte=3, status='pending').count()
        hidden = Report.objects.filter(is_content_hidden=True).count()
        resolved = Report.objects.filter(status='resolved').count()
        dismissed = Report.objects.filter(status='dismissed').count()

        return Response({
            'total': total,
            'pending': pending,
            'reviewing': reviewing,
            'high_priority': high_priority,
            'hidden_content': hidden,
            'resolved': resolved,
            'dismissed': dismissed,
        })


class CSModerationLogView(APIView):
    """GET /api/messaging/cs/modlog/ — audit log of moderation actions."""
    permission_classes = [IsCustomerService]

    def get(self, request):
        logs = ModerationLog.objects.select_related(
            'admin', 'target_user', 'report'
        ).all()[:100]

        data = [{
            'id': log.id,
            'admin': log.admin.username,
            'action_type': log.action_type,
            'action_display': log.get_action_type_display(),
            'target_user': log.target_user.username,
            'target_user_name': log.target_user.get_full_name(),
            'report_id': log.report_id,
            'notes': log.notes,
            'created_at': log.created_at.isoformat(),
        } for log in logs]

        return Response(data)


# ──────────── User Search (for starting new conversations) ────────────

class UserSearchView(APIView):
    """GET /api/messaging/users/search/?q=... — search users to start a conversation."""

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])

        blocked_ids = list(BlockedUser.objects.filter(
            Q(blocker=request.user) | Q(blocked=request.user)
        ).values_list('blocker_id', 'blocked_id'))
        exclude_ids = set()
        for pair in blocked_ids:
            exclude_ids.update(pair)
        exclude_ids.discard(request.user.id)
        exclude_ids.add(request.user.id)

        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(prestataire_profile__company_name__icontains=query)
        ).exclude(id__in=exclude_ids).exclude(
            role='customer_service'
        )

        # Role-based filtering: proprietaire sees only prestataires, prestataire sees only proprietaires
        if request.user.role == 'proprietaire':
            users = users.filter(role='prestataire')
        elif request.user.role == 'prestataire':
            users = users.filter(role='proprietaire')

        users = users[:15]

        from accounts.serializers import UserPublicSerializer
        return Response(UserPublicSerializer(users, many=True).data)


# ──────────── CS Views ────────────

class CSConversationListView(generics.ListAPIView):
    """GET /api/messaging/cs/all/ - All conversations (CS only)."""
    serializer_class = ConversationListSerializer
    permission_classes = [IsCustomerService]
    queryset = Conversation.objects.all().prefetch_related('participants', 'messages')
