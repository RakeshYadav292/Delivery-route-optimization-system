"""
============================================================
Delivery Route Optimization System — FINAL STABLE VERSION
A* + TSP + Database + Auth
============================================================
"""
import heapq
import math
import sqlite3
import random
import os
from itertools import permutations
from contextlib import contextmanager
from flask import Flask, render_template, request, jsonify, session

app = Flask(__name__)
app.secret_key = "super_secret_route_key"
DB_NAME = "route_optimizer.db"

# ============================================================
# DATABASE UTILITIES
# ============================================================
def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def db_session():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def safe_float(val, default=0.0):
    try:
        if val is None:
            return default
        if isinstance(val, str):
            val = val.strip()
            if not val:
                return default
        return float(val)
    except (ValueError, TypeError):
        return default

def init_db():
    """Initializes the database if it doesn't exist or is empty/corrupt."""
    needs_init = False
    if not os.path.exists(DB_NAME) or os.path.getsize(DB_NAME) == 0:
        needs_init = True
    else:
        try:
            conn = get_db_connection()
            res = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='locations'").fetchone()
            conn.close()
            if not res:
                needs_init = True
        except Exception:
            needs_init = True

    if needs_init:
        with open("database.sql", "r") as f:
            sql = f.read()
        conn = get_db_connection()
        conn.executescript(sql)
        conn.commit()
        conn.close()

def load_graph_from_db():
    with db_session() as conn:
        locs = conn.execute("SELECT name, lat, lng FROM locations").fetchall()
        coords = {row["name"]: (row["lat"], row["lng"]) for row in locs}
        
        edges = conn.execute("SELECT from_node, to_node, distance FROM edges").fetchall()
        graph = {}
        for edge in edges:
            f, t, d = edge["from_node"], edge["to_node"], edge["distance"]
            if f not in graph: graph[f] = []
            graph[f].append((t, d))
            # Ensure bi-directional if not already in DB
            if t not in graph: graph[t] = []
            # Check if reverse exists
            exists = any(node == f for node, dist in graph[t])
            if not exists:
                graph[t].append((f, d))
                
    return graph, coords

# Initialize
init_db()
graph, coords = load_graph_from_db()

# ============================================================
# HEURISTIC & PATHFINDING
# ============================================================
def heuristic(a, b):
    lat1, lon1 = coords[a]
    lat2, lon2 = coords[b]
    # Haversine-lite distance in KM
    return math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) * 111

def astar(start, goal):
    queue = [(0, 0, start)]  # (priority, g_cost, node)
    came_from = {}
    g_cost = {start: 0}
    visited = set()

    while queue:
        _, current_g, current = heapq.heappop(queue)

        if current in visited:
            continue
        visited.add(current)

        if current == goal:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            return list(reversed(path)), g_cost[goal]

        for neighbor, weight in graph.get(current, []):
            if neighbor in visited:
                continue

            new_cost = current_g + weight

            if neighbor not in g_cost or new_cost < g_cost[neighbor]:
                g_cost[neighbor] = new_cost
                priority = new_cost + heuristic(neighbor, goal)
                heapq.heappush(queue, (priority, new_cost, neighbor))
                came_from[neighbor] = current

    return None, float("inf")

def compute_distance_matrix(nodes):
    dist = {n: {} for n in nodes}
    for i in range(len(nodes)):
        dist[nodes[i]][nodes[i]] = 0
        for j in range(i + 1, len(nodes)):
            _, d = astar(nodes[i], nodes[j])
            dist[nodes[i]][nodes[j]] = d
            dist[nodes[j]][nodes[i]] = d
    return dist

def solve_tsp(start, stops, end, dist):
    # If no stops, just return direct path
    if not stops:
        return [start, end], dist[start][end]

    # Limit brute force to 8 stops (40,320 perms) to keep it fast
    if len(stops) <= 8:
        best_route = None
        best_cost = float("inf")
        for perm in permutations(stops):
            route = [start] + list(perm) + [end]
            cost = 0
            for i in range(len(route) - 1):
                cost += dist[route[i]][route[i + 1]]
                if cost >= best_cost: 
                    break
            else:
                best_cost = cost
                best_route = route
        
        if best_route and best_cost != float("inf"):
            return best_route, best_cost

    # Fallback: Nearest Neighbor Heuristic (Greedy)
    curr = start
    unvisited = list(stops)
    route = [start]
    total_cost = 0
    
    while unvisited:
        next_node = min(unvisited, key=lambda x: dist[curr][x])
        if dist[curr][next_node] == float("inf"):
            # If next closest is unreachable, abort and return unoptimized
            return [start] + list(stops) + [end], float("inf")
        total_cost += dist[curr][next_node]
        route.append(next_node)
        unvisited.remove(next_node)
        curr = next_node
        
    total_cost += dist[curr][end]
    route.append(end)
    return route, total_cost

# ============================================================
# UI ROUTES
# ============================================================
@app.route("/")
def home():
    return render_template("welcome.html")

@app.route("/dashboard")
def dashboard():
    return render_template("index.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/signup")
def signup_page():
    return render_template("signup.html")

# ============================================================
# API ROUTES
# ============================================================
@app.route("/locations")
def locations():
    return jsonify({"locations": sorted(graph.keys())})

@app.route("/history")
def history():
    try:
        with db_session() as conn:
            rows = conn.execute("SELECT * FROM route_history ORDER BY created_at DESC LIMIT 20").fetchall()
            history_list = [dict(r) for r in rows]
        return jsonify({"history": history_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/optimize", methods=["POST"])
def optimize():
    data = request.json
    src = data.get("source")
    dst = data.get("destination")
    pts = [p.strip() for p in data.get("delivery_points", []) if p.strip()]
    ld = safe_float(data.get("delivery_load"), 0.0)
    cp = safe_float(data.get("vehicle_capacity"), 1.0)

    if src not in graph or dst not in graph:
        return jsonify({"error": "Invalid source or destination"}), 400

    import time
    start_time = time.time()

    nodes = [src] + pts + [dst]
    dist_matrix = compute_distance_matrix(nodes)
    optimized_route, total_dist = solve_tsp(src, pts, dst, dist_matrix)
    
    end_time = time.time()
    execution_time = round((end_time - start_time) * 1000, 2)  # In milliseconds

    unoptimized_route = [src] + pts + [dst]
    unoptimized_distance = 0
    for i in range(len(unoptimized_route) - 1):
        unoptimized_distance += dist_matrix[unoptimized_route[i]][unoptimized_route[i+1]]

    capacity_status = "Valid" if ld <= cp else "Exceeded"

    # Save to history
    try:
        with db_session() as conn:
            conn.execute("""
                INSERT INTO route_history (source, destination, delivery_points, optimized_route, total_distance, unoptimized_distance, delivery_load, vehicle_capacity, capacity_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (src, dst, ", ".join(pts), " -> ".join(optimized_route), round(total_dist, 2), round(unoptimized_distance, 2), ld, cp, capacity_status))
    except Exception as e:
        print(f"History DB Error: {e}")

    # Get exact path using A* for display
    path_coords = []
    for i in range(len(optimized_route) - 1):
        segment_path, _ = astar(optimized_route[i], optimized_route[i+1])
        if segment_path:
            # Avoid duplicating the connection node
            if path_coords:
                segment_path = segment_path[1:]
            for node in segment_path:
                path_coords.append({"name": node, "lat": coords[node][0], "lng": coords[node][1]})

    unoptimized_path_coords = []
    for i in range(len(unoptimized_route) - 1):
        segment_path, _ = astar(unoptimized_route[i], unoptimized_route[i+1])
        if segment_path:
            if unoptimized_path_coords:
                segment_path = segment_path[1:]
            for node in segment_path:
                unoptimized_path_coords.append({"name": node, "lat": coords[node][0], "lng": coords[node][1]})

    # Prepare response coordinates
    stop_coords = [{"name": n, "lat": coords[n][0], "lng": coords[n][1]} for n in optimized_route]
    unoptimized_stop_coords = [{"name": n, "lat": coords[n][0], "lng": coords[n][1]} for n in unoptimized_route]

    return jsonify({
        "optimized_route": optimized_route,
        "total_distance": round(total_dist, 2),
        "unoptimized_route": unoptimized_route,
        "unoptimized_distance": round(unoptimized_distance, 2),
        "capacity_status": capacity_status,
        "path_coords": path_coords,
        "unoptimized_coords": unoptimized_path_coords,
        "stop_coords": stop_coords,
        "unoptimized_stop_coords": unoptimized_stop_coords,
        "execution_time": execution_time
    })

# ============================================================
# AUTH API
# ============================================================
@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.json
    try:
        with db_session() as conn:
            conn.execute("INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)",
                         (data.get("name"), data.get("email"), data.get("password"), data.get("phone")))
        return jsonify({"success": True})
    except Exception as e:
        error_msg = str(e)
        if "users.phone" in error_msg:
            error_msg = "An account with this phone number already exists. Please login."
        elif "users.email" in error_msg:
            error_msg = "An account with this email address already exists. Please login."
        return jsonify({"error": error_msg}), 400

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not email or not password:
        return jsonify({"error": "Enter both your email address and password."}), 400
    if "@" not in email:
        return jsonify({"error": "Enter a valid email address."}), 400
    try:
        with db_session() as conn:
            user = conn.execute("SELECT * FROM users WHERE email = ? AND password = ?", 
                                (email, password)).fetchone()
        if user:
            session["user_id"] = user["id"]
            return jsonify({"success": True})
        return jsonify({"error": "The email or password you entered is incorrect."}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    mobile = request.json.get("mobile")
    otp = str(random.randint(100000, 999999))
    # Mock sending OTP
    return jsonify({"success": True, "otp": otp})

@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    # Simple mock verification
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True)