from django.urls import path
from .views import generate_floorplan_func,adjust_dimension_func,add_new_room_func
 
urlpatterns = [
    path('generate_floorplan/', generate_floorplan_func, name='generate_floorplan'),
    path('adjust_dimension/', adjust_dimension_func, name='adjust_dimension'),
    path('add_new_room/', add_new_room_func, name='add_new_room')
]