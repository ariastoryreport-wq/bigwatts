from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse

from .models import AvailabilitySlot, Booking, Payment
from .serializers import (
    AvailabilitySlotSerializer, BookingSerializer, BookingCreateSerializer,
    PaymentSerializer,
)
from . import stripe_service
from accounts.permissions import IsPrestataire, IsProprietaire


# ──────────────────── Availability Slots ────────────────────

class AvailabilitySlotListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/bookings/slots/        - Provider's slots (or slots for a provider via ?provider=ID)
    POST /api/bookings/slots/        - Create a slot (provider only)
    """
    serializer_class = AvailabilitySlotSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsPrestataire()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        provider_id = self.request.query_params.get('provider')
        quote_id = self.request.query_params.get('quote')
        include_booked = self.request.query_params.get('include_booked')

        if provider_id:
            qs = AvailabilitySlot.objects.filter(provider_id=provider_id)
            if not include_booked:
                qs = qs.filter(is_booked=False)
            return qs
        if quote_id:
            # Get available slots for the provider of the quoted ad
            from ads.models import QuoteRequest
            try:
                quote = QuoteRequest.objects.get(pk=quote_id, status='accepted')
                return AvailabilitySlot.objects.filter(
                    provider=quote.ad.provider, is_booked=False
                )
            except QuoteRequest.DoesNotExist:
                return AvailabilitySlot.objects.none()

        return AvailabilitySlot.objects.filter(provider=self.request.user)


class AvailabilitySlotDeleteView(generics.DestroyAPIView):
    """DELETE /api/bookings/slots/<id>/ - Delete own slot (if not booked)."""
    permission_classes = [IsPrestataire]

    def get_queryset(self):
        return AvailabilitySlot.objects.filter(
            provider=self.request.user, is_booked=False
        )


# ──────────────────── Bookings ────────────────────

class BookingListView(generics.ListAPIView):
    """GET /api/bookings/ - User's bookings."""
    serializer_class = BookingSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.filter(
            Q(homeowner=user) | Q(provider=user)
        ).select_related('quote', 'quote__ad', 'homeowner', 'provider', 'slot')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class BookingCreateView(APIView):
    """POST /api/bookings/create/ - Homeowner books from an accepted quote."""
    permission_classes = [IsProprietaire]

    def post(self, request):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quote_id = serializer.validated_data['quote_id']
        slot_id = serializer.validated_data['slot_id']
        notes = serializer.validated_data.get('notes', '')

        # Validate quote
        from ads.models import QuoteRequest
        try:
            quote = QuoteRequest.objects.select_related('ad').get(
                pk=quote_id, owner=request.user, status='accepted'
            )
        except QuoteRequest.DoesNotExist:
            return Response(
                {'error': 'Devis introuvable ou non accepté.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check no existing booking for this quote
        if hasattr(quote, 'booking'):
            return Response(
                {'error': 'Un rendez-vous existe déjà pour ce devis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate slot with select_for_update to prevent double-booking
        from django.db import transaction
        try:
            with transaction.atomic():
                slot = AvailabilitySlot.objects.select_for_update().get(
                    pk=slot_id, provider=quote.ad.provider, is_booked=False
                )
        except AvailabilitySlot.DoesNotExist:
            return Response(
                {'error': 'Ce créneau vient d\'être réservé par quelqu\'un d\'autre. Veuillez en choisir un autre.'},
                status=status.HTTP_409_CONFLICT
            )

        # Create booking
        booking = Booking.objects.create(
            quote=quote,
            homeowner=request.user,
            provider=quote.ad.provider,
            slot=slot,
            status='pending',
            notes=notes,
        )

        # Mark slot as booked
        slot.is_booked = True
        slot.save(update_fields=['is_booked'])

        # Notify provider
        from notifications.models import Notification
        Notification.objects.create(
            recipient=quote.ad.provider,
            notification_type='system',
            title='Nouvelle réservation',
            message=f'{request.user.get_full_name() or request.user.username} a réservé un créneau pour "{quote.ad.title}".',
            link='/dashboard/bookings'
        )

        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )


class BookingUpdateView(APIView):
    """PATCH /api/bookings/<id>/ - Update booking status."""

    def patch(self, request, pk):
        user = request.user
        try:
            booking = Booking.objects.select_related('quote', 'quote__ad').get(
                pk=pk
            )
        except Booking.DoesNotExist:
            return Response({'error': 'Réservation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify user is participant
        if user != booking.homeowner and user != booking.provider:
            return Response({'error': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')

        # State machine validation
        valid_transitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['deposit_paid', 'cancelled'],
            'deposit_paid': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
        }
        allowed = valid_transitions.get(booking.status, [])
        if new_status not in allowed:
            return Response(
                {'error': f'Transition {booking.status} → {new_status} non autorisée.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Only provider can confirm/start/complete
        if new_status in ('confirmed', 'in_progress', 'completed') and user != booking.provider:
            return Response(
                {'error': 'Seul le prestataire peut effectuer cette action.'},
                status=status.HTTP_403_FORBIDDEN
            )

        booking.status = new_status
        booking.save(update_fields=['status', 'updated_at'])

        # If cancelled, free the slot
        if new_status == 'cancelled' and booking.slot:
            booking.slot.is_booked = False
            booking.slot.save(update_fields=['is_booked'])

        # Notify other party
        from notifications.models import Notification
        other = booking.homeowner if user == booking.provider else booking.provider
        status_labels = dict(Booking.Status.choices)
        Notification.objects.create(
            recipient=other,
            notification_type='system',
            title='Réservation mise à jour',
            message=f'La réservation pour "{booking.quote.ad.title}" est maintenant : {status_labels.get(new_status, new_status)}.',
            link='/dashboard/bookings'
        )

        return Response(BookingSerializer(booking).data)


# ──────────────────── Payments ────────────────────

class CreateDepositIntentView(APIView):
    """POST /api/bookings/<id>/pay-deposit/ - Create Stripe payment intent for deposit."""
    permission_classes = [IsProprietaire]

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related('quote').get(
                pk=pk, homeowner=request.user
            )
        except Booking.DoesNotExist:
            return Response({'error': 'Réservation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('confirmed',):
            return Response(
                {'error': 'La réservation doit être confirmée pour payer l\'acompte.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if deposit already paid
        existing = booking.payments.filter(payment_type='deposit', status='paid').first()
        if existing:
            return Response(
                {'error': 'L\'acompte a déjà été payé.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deposit = booking.deposit_amount
        if deposit <= 0:
            return Response(
                {'error': 'Pas de prix proposé dans le devis.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        platform_fee = stripe_service.calculate_platform_fee(deposit)

        try:
            client_secret, intent_id = stripe_service.create_payment_intent(
                amount_eur=deposit,
                metadata={
                    'booking_id': str(booking.pk),
                    'type': 'deposit',
                    'homeowner_id': str(request.user.pk),
                }
            )
        except Exception as e:
            return Response(
                {'error': f'Erreur Stripe: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create payment record
        payment = Payment.objects.create(
            booking=booking,
            stripe_payment_intent_id=intent_id,
            amount=deposit,
            platform_fee=platform_fee,
            payment_type='deposit',
            status='pending',
        )

        # If mock mode (no real Stripe), auto-mark as paid
        if intent_id.startswith('pi_mock_'):
            payment.status = 'paid'
            payment.save(update_fields=['status'])
            # Auto-transition booking to deposit_paid
            booking.status = 'deposit_paid'
            booking.save(update_fields=['status', 'updated_at'])
            # Notify provider
            from notifications.models import Notification
            Notification.objects.create(
                recipient=booking.provider,
                notification_type='system',
                title='Acompte re\u00e7u',
                message=f'L\'acompte de {deposit}\u20ac pour "{booking.quote.ad.title}" a \u00e9t\u00e9 pay\u00e9.',
                link='/dashboard/bookings'
            )

        return Response({
            'client_secret': client_secret,
            'payment_intent_id': intent_id,
            'amount': str(deposit),
            'platform_fee': str(platform_fee),
            'payment_id': payment.pk,
            'mock': intent_id.startswith('pi_mock_'),
        })


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """POST /api/bookings/webhook/stripe/ - Handle Stripe webhooks."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')

        event = stripe_service.verify_webhook_signature(payload, sig_header)
        if event is None:
            return HttpResponse(status=400)

        if event['type'] == 'payment_intent.succeeded':
            intent = event['data']['object']
            intent_id = intent['id']

            try:
                payment = Payment.objects.get(stripe_payment_intent_id=intent_id)
                payment.status = 'paid'
                payment.save(update_fields=['status', 'updated_at'])

                # Auto-transition booking to deposit_paid
                booking = payment.booking
                if payment.payment_type == 'deposit' and booking.status == 'confirmed':
                    booking.status = 'deposit_paid'
                    booking.save(update_fields=['status', 'updated_at'])

                # Notify
                from notifications.models import Notification
                Notification.objects.create(
                    recipient=booking.provider,
                    notification_type='system',
                    title='Paiement re\u00e7u',
                    message=f'L\'acompte de {payment.amount}\u20ac pour "{booking.quote.ad.title}" a \u00e9t\u00e9 pay\u00e9.',
                    link='/dashboard/bookings'
                )
            except Payment.DoesNotExist:
                pass

        return HttpResponse(status=200)
