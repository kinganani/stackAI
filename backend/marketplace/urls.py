from django.urls import path
from .views import (
    AnalyzeLotView,
    BuyerAlertListView,
    BuyerAlertReadView,
    MyReservationsView,
    ReservationAcceptView,
    ReservationDetailView,
    ReserveView,
    StockCancelView,
    StockCreateView,
    StockDetailView,
    StockMineView,
    StockNearbyView,
)

urlpatterns = [
    path("stocks/", StockCreateView.as_view()),
    path("stocks/analyze/", AnalyzeLotView.as_view()),
    path("stocks/mine/", StockMineView.as_view()),
    path("stocks/nearby/", StockNearbyView.as_view()),
    path("stocks/<uuid:pk>/", StockDetailView.as_view()),
    path("stocks/<uuid:pk>/cancel/", StockCancelView.as_view()),
    path("notifications/", BuyerAlertListView.as_view()),
    path("notifications/read/", BuyerAlertReadView.as_view()),
    path("notifications/<int:pk>/read/", BuyerAlertReadView.as_view()),
    path("reservations/", ReserveView.as_view()),
    path("reservations/mine/", MyReservationsView.as_view()),
    path("reservations/<uuid:pk>/accept/", ReservationAcceptView.as_view()),
    path("reservations/<uuid:pk>/", ReservationDetailView.as_view()),
]
