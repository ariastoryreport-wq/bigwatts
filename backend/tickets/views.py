from rest_framework import generics, permissions
from django.utils import timezone

from .models import Ticket, TicketResponse
from .serializers import TicketSerializer, TicketUpdateSerializer, TicketResponseSerializer
from accounts.permissions import IsCustomerService


class TicketCreateView(generics.CreateAPIView):
    """POST /api/tickets/ - Create a support ticket."""
    serializer_class = TicketSerializer


class MyTicketsView(generics.ListAPIView):
    """GET /api/tickets/my/ - User's tickets."""
    serializer_class = TicketSerializer
    
    def get_queryset(self):
        return Ticket.objects.filter(created_by=self.request.user).prefetch_related('responses')


class TicketDetailView(generics.RetrieveAPIView):
    """GET /api/tickets/<id>/ - Ticket detail."""
    serializer_class = TicketSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.role == 'customer_service':
            return Ticket.objects.all()
        return Ticket.objects.filter(created_by=user)


class TicketRespondView(generics.CreateAPIView):
    """POST /api/tickets/<id>/respond/ - Add response to ticket."""
    serializer_class = TicketResponseSerializer
    
    def perform_create(self, serializer):
        ticket = Ticket.objects.get(pk=self.kwargs['pk'])
        response = serializer.save(author=self.request.user, ticket=ticket)
        
        # Notify the other party
        from notifications.utils import create_notification
        if self.request.user == ticket.created_by:
            # User responded, notify CS
            if ticket.assigned_to:
                create_notification(
                    recipient=ticket.assigned_to,
                    notification_type='ticket_update',
                    title=f'Réponse sur ticket #{ticket.pk}',
                    message=f'{self.request.user.username} a répondu sur le ticket: {ticket.subject}',
                    link=f'/dashboard/tickets/{ticket.pk}'
                )
        else:
            # CS responded, notify user
            create_notification(
                recipient=ticket.created_by,
                notification_type='ticket_update',
                title=f'Réponse sur votre ticket #{ticket.pk}',
                message=f'Le support a répondu sur votre ticket: {ticket.subject}',
                link=f'/dashboard/tickets/{ticket.pk}'
            )


# --- CS Views ---

class CSTicketListView(generics.ListAPIView):
    """GET /api/tickets/cs/all/ - All tickets (CS only)."""
    serializer_class = TicketSerializer
    permission_classes = [IsCustomerService]
    
    def get_queryset(self):
        qs = Ticket.objects.all().prefetch_related('responses')
        status_filter = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        category = self.request.query_params.get('category')
        assigned = self.request.query_params.get('assigned_to')
        
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority:
            qs = qs.filter(priority=priority)
        if category:
            qs = qs.filter(category=category)
        if assigned == 'me':
            qs = qs.filter(assigned_to=self.request.user)
        elif assigned == 'unassigned':
            qs = qs.filter(assigned_to__isnull=True)
        return qs


class CSTicketUpdateView(generics.UpdateAPIView):
    """PATCH /api/tickets/cs/<id>/update/ - Update ticket (CS only)."""
    serializer_class = TicketUpdateSerializer
    permission_classes = [IsCustomerService]
    queryset = Ticket.objects.all()
    
    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'resolved' and not instance.resolved_at:
            instance.resolved_at = timezone.now()
            instance.save()
