from django.urls import path

from .views import (
    AnalyzeLotView,
    ApplyPromoView,
    CancelStockView,
    MyStocksView,
    NearbyView,
    PublicCatalogView,
    StockListCreateView,
    UpdateStockView,
    VoiceDeclareView,
)

urlpatterns = [
    path("stocks/", StockListCreateView.as_view()),
    path("stocks/analyze/", AnalyzeLotView.as_view()),
    path("stocks/voice/", VoiceDeclareView.as_view()),
    path("stocks/mine/", MyStocksView.as_view()),
    path("stocks/public/", PublicCatalogView.as_view()),
    path("stocks/nearby/", NearbyView.as_view()),
    path("stocks/<uuid:stock_id>/promo/", ApplyPromoView.as_view()),
    path("stocks/<uuid:stock_id>/", UpdateStockView.as_view()),
    path("stocks/<uuid:stock_id>/cancel/", CancelStockView.as_view()),
]
