import numpy as np
from collections import deque


def planner(map, start_row, start_column):
    map = np.array(map, dtype=np.int32)  # Use a data type that can handle larger values

    rows = len(map)
    cols = len(map[0])

    # Directions for 8-point connectivity: [up, right, down, left, upper-right, lower-right, lower-left, upper-left]
    directions = [(-1, 0), (0, 1), (1, 0), (0, -1), (-1, 1), (1, 1), (1, -1), (-1, -1)]

    # Find the goal position
    goal_row, goal_col = None, None
    for r in range(rows):
        for c in range(cols):
            if map[r][c] == 2:
                goal_row, goal_col = r, c
                break
        if goal_row is not None:
            break

    if goal_row is None or goal_col is None:
        raise ValueError("Goal position not found in the map.")

    # Initialize the queue for BFS
    queue = deque([(goal_row, goal_col)])
    visited = set()
    visited.add((goal_row, goal_col))

    # Perform the wavefront expansion
    while queue:
        curr_row, curr_col = queue.popleft()
        curr_value = map[curr_row][curr_col]

        for dr, dc in directions:
            nr, nc = curr_row + dr, curr_col + dc
            if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in visited and map[nr][nc] == 0:
                map[nr][nc] = curr_value + 1
                visited.add((nr, nc))
                queue.append((nr, nc))

    # Trace back the trajectory using the populated value_map
    trajectory = []
    current_position = (start_row - 1, start_column - 1)

    while map[current_position[0]][current_position[1]] != 2:
        trajectory.append((current_position[0] + 1, current_position[1] + 1))
        min_value = float('inf')
        next_position = None

        for dr, dc in directions:
            nr, nc = current_position[0] + dr, current_position[1] + dc
            if 0 <= nr < rows and 0 <= nc < cols and map[nr][nc] != 1:
                if map[nr][nc] < min_value:
                    min_value = map[nr][nc]
                    next_position = (nr, nc)

        if next_position:  # Move to the next position
            current_position = next_position
        else:
            break  # No valid move

    trajectory.append((current_position[0] + 1, current_position[1] + 1))  # Add the goal position to the trajectory

    return map, trajectory


def display_results(value_map, trajectory):
    # Print the value map
    print("\n" + "=" * 50 + " Value Map " + "=" * 50)
    for row in value_map:
        print(" ".join(f"{val:4d}" for val in row))  # Right-align values with padding

    # Print the trajectory
    print("\n" + "=" * 50 + " Trajectory " + "=" * 50)
    for i, step in enumerate(trajectory, start=1):
        print(f"Step {i}: {step}")
