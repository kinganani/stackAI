from django.urls import path

from .views import MyReservationsView, ReservationAcceptView, ReservationCreateView, ReservationDetailView, RouteGuideView

urlpatterns = [
    path("reservations/", ReservationCreateView.as_view()),
    path("reservations/mine/", MyReservationsView.as_view()),
    path("reservations/guide/", RouteGuideView.as_view()),
    path("reservations/<uuid:reservation_id>/accept/", ReservationAcceptView.as_view()),
    path("reservations/<uuid:reservation_id>/", ReservationDetailView.as_view()),
]
