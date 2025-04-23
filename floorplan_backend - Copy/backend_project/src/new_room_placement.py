import copy
import matplotlib.pyplot as plt
from collections import defaultdict, Counter
import sys
metadata = {}

def truncate_to_two_decimals(value):
    return int(value * 100) / 100.0

def calculate_area(coordinates):
    x_coords = [point[0] for point in coordinates]
    y_coords = [point[1] for point in coordinates]
    return truncate_to_two_decimals(0.5 * abs(sum(x * y for x, y in zip(x_coords, y_coords[1:] + y_coords[:1])) - sum(y * x for x, y in zip(x_coords[1:] + x_coords[:1], y_coords))))

def calculate_wall_length(start, end):
    return truncate_to_two_decimals(((end[0] - start[0])**2 + (end[1] - start[1])**2)**0.5)

def determine_wall_type(start, end):
    if start[0] == end[0]:
        return 'vertical'
    elif start[1] == end[1]:
        return 'horizontal'
    else:
        return 'diagonal'


def get_direction(start, end, room_min_x, room_max_x, room_min_y, room_max_y):
    if start[1] == end[1]:  # Horizontal line
        if start[1] == room_max_y:
            return 'North'
        elif start[1] == room_min_y:
            return 'South'
    elif start[0] == end[0]:  # Vertical line
        if start[0] == room_min_x:
            return 'West'
        elif start[0] == room_max_x:
            return 'East'
    return 'Unknown'


# Function to check for overlaps between wall segments
def check_overlap(w1, w2):
    # Sort the points to simplify the logic
    w1 = sorted(w1)
    w2 = sorted(w2)

    # Check for vertical overlap
    if w1[0][0] == w1[1][0] == w2[0][0] == w2[1][0]:  # All x are the same
        return not (w1[1][1] <= w2[0][1] or w2[1][1] <= w1[0][1])
    # Check for horizontal overlap
    elif w1[0][1] == w1[1][1] == w2[0][1] == w2[1][1]:  # All y are the same
        return not (w1[1][0] <= w2[0][0] or w2[1][0] <= w1[0][0])
    return False


def is_wall_free(coords, room_name, rooms):
    for other_room, walls in rooms.items():
        if other_room != room_name:
            for wall in walls:
                if check_overlap(coords, wall):
                    return False
    return True

def make_roomdata(rooms):
    metadata = {}
    total_area = 0
    wall_counter = 1  # Unique identifier for each wall across all rooms

    for room, walls in rooms.items():
        room_area = truncate_to_two_decimals(calculate_area([wall[0] for wall in walls]))
        total_area += room_area
        wall_numbers = {'horizontal': [], 'vertical': []}  # Separate wall numbers by type

        for wall in walls:
            start, end = copy.deepcopy(wall)
            length = calculate_wall_length(start, end)
            wall_type = determine_wall_type(start, end)
            wall_numbers[wall_type].append(wall_counter)

            room_min_x = min(min(wall[0][0], wall[1][0]) for wall in walls)
            room_max_x = max(max(wall[0][0], wall[1][0]) for wall in walls)
            room_min_y = min(min(wall[0][1], wall[1][1]) for wall in walls)
            room_max_y = max(max(wall[0][1], wall[1][1]) for wall in walls)
            direction = get_direction(start, end, room_min_x, room_max_x, room_min_y, room_max_y)
            metadata.setdefault(room, {})[wall_counter] = {
                'wall_length': length,
                'wall_type': wall_type,
                'coordinates': [start, end],
                'room_area': room_area,
                'parallel_walls': [],
                'is_free': is_wall_free([start, end], room, rooms),
                'direction': direction
            }
            wall_counter += 1

        # Assign parallel wall numbers within each wall type
        for wall_type in ['horizontal', 'vertical']:
            numbers = wall_numbers[wall_type]
            for number in numbers:
                metadata[room][number]['parallel_walls'] = numbers

    return metadata




def is_overlapping_or_touching(line1, line2):
    (x1_start, y1_start), (x1_end, y1_end) = line1
    (x2_start, y2_start), (x2_end, y2_end) = line2
 
    if x1_start == x1_end == x2_start == x2_end:  # Vertical lines
        return max(min(y1_start, y1_end), min(y2_start, y2_end)) < min(max(y1_start, y1_end), max(y2_start, y2_end))
    elif y1_start == y1_end == y2_start == y2_end:  # Horizontal lines
        return max(min(x1_start, x1_end), min(x2_start, x2_end)) < min(max(x1_start, x1_end), max(x2_start, x2_end))
    return False

def group_near_values(values, threshold=0.9):
    groups = []
    while values:
        base = values.pop(0)
        group = [base]
        for v in values[:]:
            if abs(base - v) < threshold:
                group.append(v)
                values.remove(v)
        groups.append(group)
    return groups

def replace_near_values(rooms, threshold=0.9):
    all_values = []
    for coordinates in rooms.values():
        for line in coordinates:
            for point in line:
                all_values.append(point[0])
                all_values.append(point[1])
 
    unique_values = list(set(all_values))
    groups = group_near_values(unique_values, threshold)
    most_frequent_values = get_most_frequent_value(groups)
 
    for coordinates in rooms.values():
        for line in coordinates:
            for point in line:
                for group, value in most_frequent_values.items():
                    if point[0] in group:
                        point[0] = truncate_to_two_decimals(value)
                    if point[1] in group:
                        point[1] = truncate_to_two_decimals(value)
    return rooms

def is_direction_free(room, direction, metadata):
    for wall_id, data in metadata[room].items():
        if metadata[room][wall_id]['direction'] == direction:
            if metadata[room][wall_id]['is_free'] == True:
                return True
    return False

def get_most_frequent_value(groups):
    most_frequent_values = {}
    for group in groups:
        counter = Counter(group)
        most_frequent_values[tuple(group)] = counter.most_common(1)[0][0]
    return most_frequent_values

def find_adjacent_rooms(room_name, rooms):
    rooms=replace_near_values(rooms, threshold=0.3)
    metadata = make_roomdata(rooms)
    adjacent_rooms = {'North': [], 'South': [], 'East': [], 'West': []}
    # Retrieve walls of the specified room
    target_room_walls = rooms[room_name]
 
    # Iterate over each wall in the target room
    for target_wall in target_room_walls:
        t_x1, t_y1 = target_wall[0]
        t_x2, t_y2 = target_wall[1]
 
        for other_room, other_walls in rooms.items():
            if other_room == room_name:
                continue  # Skip the same room
 
            for other_wall in other_walls:
                o_x1, o_y1 = other_wall[0]
                o_x2, o_y2 = other_wall[1]
 
                # Check for overlapping or touching lines
                if is_overlapping_or_touching([target_wall[0], target_wall[1]], [other_wall[0], other_wall[1]]):
                    # Determine direction based on position relative to target room
                    if t_x1 == t_x2 == o_x1 == o_x2:  # Vertical alignment
                        if t_y1 < t_y2:
                            adjacent_rooms['West'].append(other_room)
                        else:
                            adjacent_rooms['East'].append(other_room)
                    elif t_y1 == t_y2 == o_y1 == o_y2:  # Horizontal alignment
                        if t_x1 < t_x2:
                            adjacent_rooms['North'].append(other_room)
                        else:
                            adjacent_rooms['South'].append(other_room)
 
    # Remove duplicates and clean up the data
    for direction in adjacent_rooms:
        adjacent_rooms[direction] = list(set(adjacent_rooms[direction]))
 
    return adjacent_rooms

def is_side_free(metadata, room, direction):
    for wall_id, wall in metadata[room].items():
        if wall['direction'] == direction:
            #print(f"Wall ID: {wall_id}, Direction: {direction}, Is Free: {wall['is_free']}")
            if wall['is_free']:
                return True
    return False

def get_wall_coordinates(metadata, room_name, direction):
    # Check if the room exists in the metadata
    if room_name not in metadata:
        return f"Room '{room_name}' not found in metadata."

    # Iterate over the walls in the specified room
    for wall_id, wall_data in metadata[room_name].items():
        # Check if the wall direction matches the requested direction
        if wall_data['direction'].lower() == direction.lower():
            return wall_data['coordinates']

    return f"No wall with direction '{direction}' found in room '{room_name}'."


def shift_coordinates(coords, x_shift=0, y_shift=0):
    new_coords = []
    for line in coords:
        new_line = [[point[0] + x_shift, point[1] + y_shift] for point in line]
        new_coords.append(new_line)
    return new_coords

def select_coordinate_pair(coords, direction):
    if direction in ['North', 'South']:
        # Choose based on x value
        return min(coords, key=lambda c: c[0])
    elif direction in ['East', 'West']:
        # Choose based on y value
        return max(coords, key=lambda c: c[1])

def add_new_room_main(room_data, new_room, length, width, existing_room, given_direction):

    global metadata
    room_data = replace_near_values(room_data, threshold=0.2)

    metadata = make_roomdata(room_data)

    if given_direction not in ['Top', 'Bottom', 'Left', 'Right']:
        raise ValueError("Invalid direction. Choose from 'Top', 'Bottom', 'Left', 'Right'.")
    
    map_direction = {'Top': 'North', 'Bottom': 'South', 'Left': 'West', 'Right': 'East'}
    map_opposite_direction = {'North': 'South', 'South': 'North', 'East': 'West', 'West': 'East'}

    direction = map_direction[given_direction]
    print(f"Direction: {direction}")

    # Check if the specified direction is free
    is_free = is_side_free(metadata, existing_room, direction)
    coords = get_wall_coordinates(metadata, existing_room, direction)

    #print(f"Is the {direction} side free? {is_free}")
    print(f"Coords: {coords}")


    opposite_direction = map_opposite_direction[direction]
    print(f"Opposite direction: {opposite_direction}")
    is_opposite_direction_free = is_side_free(metadata, existing_room, opposite_direction)

    #coords = get_wall_coordinates(metadata, existing_room, opposite_direction)
    print(f"oppo coords : {coords}")

    if not is_free:
        if is_opposite_direction_free:
            coord_pair = select_coordinate_pair(coords, direction)
            #print(f"oppo coords : {coords}")
            if direction == 'North':
                room_data[existing_room] = shift_coordinates(room_data[existing_room], y_shift=-width)
                new_top_left = [coord_pair[0], coord_pair[1]]
            elif direction == 'South':
                room_data[existing_room] = shift_coordinates(room_data[existing_room], y_shift=width)
                new_top_left = [coord_pair[0], coord_pair[1] + width]
            elif direction == 'East':
                room_data[existing_room] = shift_coordinates(room_data[existing_room], x_shift=-length)
                new_top_left = [coord_pair[0] - length, coord_pair[1]]
            elif direction == 'West':
                room_data[existing_room] = shift_coordinates(room_data[existing_room], x_shift=length)
                new_top_left = [coord_pair[0], coord_pair[1]]


            # Use the coords to determine the new room's coordinates
            coord_pair = select_coordinate_pair(coords, direction)
            #print(f"Coord pair: {coord_pair}")
            print(f"New top left: {new_top_left}")

            new_coords = [
        [new_top_left, [new_top_left[0] + length, new_top_left[1]]],
        [[new_top_left[0] + length, new_top_left[1]], [new_top_left[0] + length, new_top_left[1] - width]],
        [[new_top_left[0] + length, new_top_left[1] - width], [new_top_left[0], new_top_left[1] - width]],
        [[new_top_left[0], new_top_left[1] - width], new_top_left]
        ]
            room_data[new_room] = new_coords
            return room_data

        else:
            if given_direction=='Top' or given_direction=='Bottom':
                possible_directions=['North', 'South']
            else:
                possible_directions=['East', 'West']

            adjacent_rooms_directions = []
            adjacent_rooms = find_adjacent_rooms(existing_room, room_data)
            print(f"adjacent_rooms : {adjacent_rooms}")
            for dir in possible_directions:
                if all(is_direction_free(adj_room, dir, metadata) for adj_room in adjacent_rooms[dir] if adj_room in metadata):
                    for adj_room in adjacent_rooms[dir]:
                        adjacent_rooms_directions.append({adj_room: dir})
                        print('adjacent_rooms_directions',adjacent_rooms_directions)
            
            if adjacent_rooms_directions:
                # Extract the first direction from the first dictionary in the list
                first_room_direction = adjacent_rooms_directions[0]
                first_direction = next(iter(first_room_direction.values()))
                
                # List to store the room names with the same direction as the first one
                same_direction_rooms = []

                # Iterate over the dictionaries to find rooms with the same direction
                for room_direction in adjacent_rooms_directions:
                    # Extract the direction and room name
                    adj_direction = next(iter(room_direction.values()))
                    room_name = next(iter(room_direction.keys()))
                    
                    # Check if the direction matches the first direction
                    if adj_direction == first_direction:
                        same_direction_rooms.append(room_name)
                
                # The variable `first_direction` stores the direction from the first dictionary
                # The list `same_direction_rooms` stores all room names with the same direction
                print(f"First Direction: {first_direction}")
                print(f"Rooms with the same direction: {same_direction_rooms}")

                if opposite_direction == first_direction:
                    print(f"direction inside: {direction}")
                    coord_pair = select_coordinate_pair(coords, direction)
                    #print(f"oppo coords : {coords}")
                    for room in same_direction_rooms + [existing_room]:
                        if direction == 'North':
                            room_data[room] = shift_coordinates(room_data[room], y_shift=-width)
                            new_top_left = [coord_pair[0], coord_pair[1]]
                        elif direction == 'South':
                            room_data[room] = shift_coordinates(room_data[room], y_shift=width)
                            new_top_left = [coord_pair[0], coord_pair[1] + width]
                        elif direction == 'East':
                            room_data[room] = shift_coordinates(room_data[room], x_shift=-length)
                            new_top_left = [coord_pair[0] - length, coord_pair[1]]
                        elif direction == 'West':
                            room_data[room] = shift_coordinates(room_data[room], x_shift=length)
                            new_top_left = [coord_pair[0], coord_pair[1]]


                    print(f"New top left: {new_top_left}")

                    new_coords = [
                [new_top_left, [new_top_left[0] + length, new_top_left[1]]],
                [[new_top_left[0] + length, new_top_left[1]], [new_top_left[0] + length, new_top_left[1] - width]],
                [[new_top_left[0] + length, new_top_left[1] - width], [new_top_left[0], new_top_left[1] - width]],
                [[new_top_left[0], new_top_left[1] - width], new_top_left]
                ]
                    room_data[new_room] = new_coords
                    return room_data      

                else:
                    print(f"direction inside else: {direction}")
                    coord_pair = select_coordinate_pair(coords, direction)
                    #print(f"Coord pair: {coord_pair}")

                    for room in same_direction_rooms:
                        if direction == 'North':
                            room_data[room] = shift_coordinates(room_data[room], y_shift=width)
                            new_top_left = [coord_pair[0], coord_pair[1] + width]
                        elif direction == 'South':
                            room_data[room] = shift_coordinates(room_data[room], y_shift=width)
                            new_top_left = [coord_pair[0], coord_pair[1]]
                        elif direction == 'East':
                            room_data[room] = shift_coordinates(room_data[room], x_shift=length)
                            new_top_left = [coord_pair[0], coord_pair[1]]
                        elif direction == 'West':
                            room_data[room] = shift_coordinates(room_data[room], x_shift=length)                                        
                            new_top_left = [coord_pair[0] - length, coord_pair[1]]

                    #print(f"new_top_left : {new_top_left}")

                    new_coords = [
                        [new_top_left, [new_top_left[0] + length, new_top_left[1]]],
                        [[new_top_left[0] + length, new_top_left[1]], [new_top_left[0] + length, new_top_left[1] - width]],
                        [[new_top_left[0] + length, new_top_left[1] - width], [new_top_left[0], new_top_left[1] - width]],
                        [[new_top_left[0], new_top_left[1] - width], new_top_left]
                    ]
                    #print(f"New coords: {new_coords}")

                    room_data[new_room] = new_coords
                    return room_data


            else:
               sys.exit(f"Neither the {direction} nor the {opposite_direction} side of {existing_room} and adjancent room is free so shifting is not possible.")

    # Use the coords to determine the new room's coordinates
    coord_pair = select_coordinate_pair(coords, direction)
    #print(f"Coord pair: {coord_pair}")

    if direction == 'North':
        new_top_left = [coord_pair[0], coord_pair[1] + width]
    elif direction == 'South':
        new_top_left = [coord_pair[0], coord_pair[1]]
    elif direction == 'East':
        new_top_left = [coord_pair[0], coord_pair[1]]
    elif direction == 'West':
        new_top_left = [coord_pair[0] - length, coord_pair[1]]

    #print(f"new_top_left : {new_top_left}")

    new_coords = [
        [new_top_left, [new_top_left[0] + length, new_top_left[1]]],
        [[new_top_left[0] + length, new_top_left[1]], [new_top_left[0] + length, new_top_left[1] - width]],
        [[new_top_left[0] + length, new_top_left[1] - width], [new_top_left[0], new_top_left[1] - width]],
        [[new_top_left[0], new_top_left[1] - width], new_top_left]
    ]
    #print(f"New coords: {new_coords}")

    room_data[new_room] = new_coords
    return room_data