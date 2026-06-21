# Delivery Route Optimization System 🚚

A complete, professional, full-stack web application designed for logistics companies to optimize their delivery routes. The system calculates the most efficient path visiting multiple locations, minimizing distance and validating vehicle capacity constraints.

This project is built as a robust academic submission (suitable for B.Tech CSE students) emphasizing modern UI/UX and algorithmic implementation.

## ✨ Features

- **A* Algorithm Implementation**: Uses A* pathfinding with Euclidean distance heuristics for optimal routing.
- **Multiple Delivery Points**: Greedy nearest-neighbor optimization built on top of A* for visiting multiple stops.
- **Capacity Validation**: Automatically checks if the delivery load fits within the specified vehicle capacity.
- **Route Visualization**: Dynamic, interactive canvas-based rendering of the computed route and graph nodes.
- **Modern UI**: Dark mode aesthetics with glassmorphism, responsive grid layout, and polished animations (no external CSS framework — pure, robust CSS).
- **History Tracking**: Saves every optimization request to a lightweight SQLite database and displays a history table.
- **Dynamic Input Forms**: Add and remove multiple delivery points dynamically.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Custom Properties, Flexbox/Grid, Animations), Vanilla JavaScript (ES6, Fetch API, HTML5 Canvas).
- **Backend**: Python 3, Flask.
- **Database**: SQLite (Zero configuration).
- **Algorithm**: A* (A-Star), Euclidean heuristic.

## 📁 Project Structure
```
delivery-route/
│
├── app.py                # Main Flask backend server with routing logic & algorithm
├── database.sql          # SQLite schema & sample data
├── requirements.txt      # Python dependencies
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── script.js         # Frontend logic, fetch API, and canvas visualization
│   └── style.css         # UI styles, CSS variables, dark mode aesthetics
└── README.md             # Project documentation (this file)
```

## 🚀 How to Run Locally

### 1. Prerequisites
Ensure you have [Python 3.8+](https://www.python.org/) installed.

### 2. Open terminal in the project directory

Navigate to the project root directory:
```bash
cd "/path/to/delivery-route"
```

### 3. Install Dependencies
Install the required Python packages (Flask and Werkzeug):
```bash
pip install -r requirements.txt
```

*(Note: On macOS/Linux, you might need to use `pip3`)*

### 4. Run the Application
Start the Flask backend server:
```bash
python app.py
```

*(Note: On macOS/Linux, you might need to use `python3 app.py`)*

### 5. Access the Web App
Open your web browser and go to:
[http://127.0.0.1:5000](http://127.0.0.1:5000)

## 💡 About the Algorithm

The backend models the city as a mathematical **Graph** using an Adjacency List. The **A* (A-Star) Algorithm** evaluates nodes based on the formula:
`f(n) = g(n) + h(n)`
- **`g(n)`**: Exact cost from the source node to the current node.
- **`h(n)`**: Estimated Euclidean distance from the current node to the goal.

For routes with multiple intermediate stops, a **Greedy Nearest Neighbor** approach is used. At each step, A* identifies the closest unvisited delivery point locally until all are visited, and finally routes to the destination.

## 🎨 UI/UX Highlights
- Dynamic Canvas Routing with gradients and glowing waypoints.
- Live form validation and responsive loading states.
- Clean JSON REST API integration.
