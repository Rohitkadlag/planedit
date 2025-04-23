from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from src.test_area import generate_floorplan_main
from src.adjust_dimension import adjust_dimension_main
from src.new_room_placement import add_new_room_main
import json
 
@api_view(['POST'])
def generate_floorplan_func(request):
    try:
        # Access the entire JSON data
        data = request.data
       
        # Extract required fields
        template = data.get('template')  # For example: "1BHK_template5"
        flat_area = data.get('flatArea')
        flat_type = data.get('type')
 
        # Ensure required fields are provided
        if not template:
            return Response({'error': 'Template is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not flat_area:
            return Response({'error': 'Flat area is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not flat_type:
            return Response({'error': 'Flat type is required.'}, status=status.HTTP_400_BAD_REQUEST)
 
        # Extract the flat type (e.g., "1BHK") and template number (e.g., "template5") from template
        try:
            type_key, template_number = template.split('_')
        except ValueError:
            return Response({'error': 'Invalid template format.'}, status=status.HTTP_400_BAD_REQUEST)
 
        # Load the coordinates from the JSON file
        try:
            with open('src/converted_coordinates.json') as f:
                coordinates_data = json.load(f)
        except FileNotFoundError:
            return Response({'error': 'Coordinates file not found.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except json.JSONDecodeError:
            return Response({'error': 'Error decoding JSON file.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
 
        # Extract the coordinates for the given flat type and template
        try:
            template_coords = coordinates_data[type_key][template_number]
        except KeyError:
            return Response({'error': 'Template not found.'}, status=status.HTTP_400_BAD_REQUEST)
 
        # Include the coordinates in the response data
        response_data = generate_floorplan_main(template_coords,flat_type,flat_area)
 
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
 
@api_view(['POST'])
def adjust_dimension_func(request):
    try:
        # Access the entire JSON data
        data = request.data
 
        # Extract required fields
        fixed_dimension = data.get('roomDimensions')  # For example: "1BHK_template5"
        canvas_coords = data.get('data')
        freeze = data.get('freeze')
 
        # Ensure required fields are provided
        if not fixed_dimension:
            return Response({'error': 'roomDimensions is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not canvas_coords:
            return Response({'error': 'data is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not freeze:
            return Response({'error': 'freeze is required.'}, status=status.HTTP_400_BAD_REQUEST)
       
       
        # Include the coordinates in the response data
        response_data = adjust_dimension_main(canvas_coords,fixed_dimension,freeze)
 
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
 
 
@api_view(['POST'])
def add_new_room_func(request):
    try:
        # Access the entire JSON data
        data = request.data
 
        # Extract required fields
        roomName = data.get('roomName')  # For example: "1BHK_template5"
        adjacentRoom = data.get('adjacentRoom')
        direction = data.get('direction')
        area = data.get('area')
        roomWidth = data.get('roomWidth')
        roomHeight = data.get('roomHeight')
        coordinates = data.get('coordinates')
        # freeze = data.get('coordinates')
        # Ensure required fields are provided
        if not roomName:
            return Response({'error': 'roomName is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not adjacentRoom:
            return Response({'error': 'adjacentRoom is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not direction:
            return Response({'error': 'direction is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not area:
            return Response({'error': 'area is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not roomWidth:
            return Response({'error': 'roomWidth is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not roomHeight:
            return Response({'error': 'roomHeight is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not coordinates:
            return Response({'error': 'coordinates is required.'}, status=status.HTTP_400_BAD_REQUEST)        
        # if not freeze:
        #     return Response({'error': 'freeze is required.'}, status=status.HTTP_400_BAD_REQUEST)
               
        # Include the coordinates in the response data
        response_data = add_new_room_main(coordinates, roomName, roomWidth, roomHeight, adjacentRoom, direction)
 
        return Response(response_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)