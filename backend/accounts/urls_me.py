from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .views import MeView

# Me is under /api/me/ via marketplace urls include from root api
