import app
import sqlite3

# Initialize db if not present
app.init_db()

# Reload graph in case DB changed
app.graph, app.coords = app.load_graph_from_db()

nodes = list(app.graph.keys())
print(f"Available nodes: {len(nodes)}")

start = "Charminar"
stops = [n for n in nodes if n != start]

dist_matrix = app.compute_distance_matrix(nodes)

# Since stops > 9, solve_tsp will use Nearest Neighbor (Greedy)
route, total_cost = app.solve_tsp(start, stops, start, dist_matrix)

print("Shortest path through all nodes (Greedy TSP):")
print(" -> ".join(route))
print(f"Total distance: {total_cost:.2f} km")
