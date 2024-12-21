import scipy.io
from app.planner import planner, display_results
from app.visualize import MapVisualizer


class Controller:
    def __init__(self, case):
        if case == 1:
            self.mini_maze()
        else:
            self.mega_maze()

    def mini_maze(self):
        # Example map for testing the planner
        test_map = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ]

        # Visualize the results
        visual = MapVisualizer(test_map)
        visual.visualize_map()

        # Set the starting point
        start = visual.start_position
        print(start)
        value_map, trajectory = planner(test_map, start[0], start[1])

        print(start)
        # Call the planner function

        visual.visualize_trajectory(trajectory)

    @staticmethod
    def __extract_matrix_from_mat(file_path):
        """
        Extract the 'map' matrix from a MATLAB (.mat) file.

        Parameters:
            file_path (str): Path to the MATLAB file.

        Returns:
            numpy.ndarray: The extracted matrix.
        """
        mat_file = scipy.io.loadmat(file_path)
        if 'map' in mat_file:
            return mat_file['map']
        else:
            raise KeyError("The 'map' variable was not found in the .mat file.")

    def mega_maze(self):
        file_path = 'static/obstacle_map.mat'
        try:
            # Correctly call the static method with the file path
            map_matrix = Controller.__extract_matrix_from_mat(file_path)

            visual = MapVisualizer(map_matrix)
            visual.visualize_map()

            start = visual.start_position

            # Ensure start position is on a walkable area
            if map_matrix[start[0], start[1]] == 1:
                start = self.find_adjacent_walkable(start, map_matrix)

            # Run the wavefront planner
            value_map, trajectory = planner(map_matrix, start[0], start[1])

            visual.visualize_trajectory(trajectory)


        except KeyError as e:
            print(f"Error: {e}")
        except ValueError as e:
            print(f"Error: {e}")
        except FileNotFoundError:
            print(f"Error: The file at '{file_path}' was not found.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")

    def find_adjacent_walkable(self, start, map_matrix):
        """
        Finds an adjacent walkable cell to the given start position.
        It is guaranteed that there is an adjacent cell that is walkable.
        Handles both numpy 2D arrays and nested lists.
        """

        def get_value(matrix, row, col):
            """
            Safely gets the value from the matrix, supporting both numpy arrays and nested lists.
            This function attempts to access the matrix using numpy-style indexing first,
            and if it fails (typically due to matrix being a nested list), it tries list indexing.
            """
            try:
                # First, try numpy-style indexing.
                return matrix[row, col]
            except (TypeError, IndexError):
                # If it fails, it falls back to list-of-lists indexing.
                try:
                    return matrix[row][col]
                except IndexError:
                    # Handling out-of-bounds access gracefully
                    return None  # or you could return a default value that represents non-walkable

        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # Four possible directions (right, down, left, up)
        for dx, dy in directions:
            nx, ny = start[0] + dx, start[1] + dy
            # Ensuring that we do not access indices out of the matrix bounds
            if 0 <= nx < len(map_matrix) and 0 <= ny < len(map_matrix[0]):
                if get_value(map_matrix, nx, ny) == 0:
                    return (nx, ny)
        raise RuntimeError("No walkable adjacent cell found, even though it's guaranteed.")
