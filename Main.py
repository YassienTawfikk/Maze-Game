from app.controller import Controller


def main():
    print("Choose a maze to solve:")
    print("1. Mini Maze")
    print("2. Mega Maze")

    try:
        choice = int(input("Enter your choice (1 or 2): ").strip())

        if choice in [1, 2]:
            control = Controller(choice)
        else:
            print("Invalid choice. Please run the program again.")
    except ValueError:
        print("Invalid input. Please enter a numeric choice (1 or 2).")


if __name__ == "__main__":
    main()
