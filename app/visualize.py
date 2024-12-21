import matplotlib.pyplot as plt
import numpy as np


class MapVisualizer:
    def __init__(self, test_map):
        """
        Initialize the MapVisualizer with the test map.
        Parameters:
            test_map (list[list[int]]): The test map matrix.
        """
        self.test_map = np.array(test_map)
        self.start_position = None  # To store start position on click

    def visualize_map(self):
        """
        Visualizes the test map using matplotlib, switching between optimized and detailed visualization
        depending on the matrix size.
        """
        # Create figure each time when visualizing the map
        self.fig, self.ax = plt.subplots(figsize=(10, 8))

        # Connect the onclick event each time the figure is created
        self.cid = self.fig.canvas.mpl_connect('button_press_event', self.onclick)

        rows, cols = self.test_map.shape

        if rows * cols > 10000:
            # Optimized visualization for large matrices
            cmap = {0: [1, 1, 1], 1: [0, 0, 0], 2: [1, 0, 0]}
            rgb_map = np.zeros((rows, cols, 3))
            for value, color in cmap.items():
                rgb_map[self.test_map == value] = color

            plt.imshow(rgb_map, origin='upper')
            plt.title("Optimized Test Map Visualization", fontsize=16)

        else:
            # Detailed visualization for smaller matrices
            cmap = {0: 'white', 1: 'black', 2: 'red'}
            for row in range(rows):
                for col in range(cols):
                    value = self.test_map[row, col]
                    color = cmap.get(value, 'blue')
                    self.ax.add_patch(plt.Rectangle((col, row), 1, 1, color=color))

            plt.xlim(0, cols)
            plt.ylim(0, rows)
            self.ax.invert_yaxis()
            self.ax.set_aspect('equal')
            plt.title("Select Start Point", fontsize=16)

        # Hide the axes and enable fullscreen
        plt.axis('off')
        plt.get_current_fig_manager().full_screen_toggle()

        # Show the plot
        plt.show()

    def onclick(self, event):
        """
        Handle mouse click event on the matplotlib figure to select start position.
        """
        if event.inaxes:
            col, row = int(event.xdata), int(event.ydata)
            self.start_position = (row + 1, col + 1)
            # print(f"Start at: row {row + 1}, column {col + 1}")
            plt.close(self.fig)

    def visualize_trajectory(self, trajectory):
        """
        Visualizes the test map and overlays the trajectory with green cells, optimized for large or small matrices.

        Parameters:
            trajectory (list[tuple[int, int]]): The trajectory to visualize.
        """
        rows, cols = self.test_map.shape

        if rows * cols > 10000:  # Optimized visualization for large matrices
            # Map the base values and trajectory into RGB colors
            cmap = {
                0: [1, 1, 1],  # White for walkable areas
                1: [0, 0, 0],  # Black for walls
                2: [1, 0, 0],  # Red for the target
            }

            rgb_map = np.zeros((rows, cols, 3))
            for value, color in cmap.items():
                rgb_map[self.test_map == value] = color

            # Overlay the trajectory in green, except the last cell
            r, c = trajectory[0]
            rgb_map[r - 1, c - 1] = [0, 0, 1]  # Blue

            for r, c in trajectory[1:-1]:
                rgb_map[r - 1, c - 1] = [0, 1, 0]  # Green

            # Highlight the last cell in yellow
            r, c = trajectory[-1]
            rgb_map[r - 1, c - 1] = [1, 0, 0]  # Red

            # Plot the RGB map
            plt.figure(figsize=(10, 8))
            plt.gcf().canvas.toolbar_visible = False  # Disable toolbar
            plt.gcf().canvas.header_visible = False  # Hide header
            plt.gcf().canvas.footer_visible = False  # Hide footer
            plt.title("Select Start Point", fontsize=16)
            plt.imshow(rgb_map, origin='upper')

        else:  # Detailed visualization for smaller matrices
            plt.figure(figsize=(10, 8))
            plt.gcf().canvas.toolbar_visible = False  # Disable toolbar
            plt.gcf().canvas.header_visible = False  # Hide header
            plt.gcf().canvas.footer_visible = False  # Hide footer
            plt.title("Map with Trajectory", fontsize=16)

            # Create a color map for visualization
            cmap = {0: 'white', 1: 'black', 2: 'red'}
            for row in range(rows):
                for col in range(cols):
                    value = self.test_map[row, col]
                    color = cmap.get(value, 'blue')
                    plt.gca().add_patch(plt.Rectangle((col, row), 1, 1, color=color))

            # Highlight the trajectory except for the last cell
            r, c = trajectory[0]
            plt.gca().add_patch(plt.Rectangle((c - 1, r - 1), 1, 1, color='blue'))

            for r, c in trajectory[1:-1]:
                plt.gca().add_patch(plt.Rectangle((c - 1, r - 1), 1, 1, color='green'))

            # Highlight the last cell in yellow
            r, c = trajectory[-1]
            plt.gca().add_patch(plt.Rectangle((c - 1, r - 1), 1, 1, color='red'))

            # Set the aspect ratio and limits
            plt.xlim(0, cols)
            plt.ylim(0, rows)
            plt.gca().invert_yaxis()
            plt.gca().set_aspect('equal')

        # Hide the axes
        plt.axis('off')

        # Set the plot to fullscreen
        plt.get_current_fig_manager().full_screen_toggle()

        # Display the plot
        plt.show()
