-- ============================================================
-- Delivery Route Optimization System — SQLite Database Schema
-- ============================================================

-- Table: locations
-- Stores all known delivery locations with real Lat/Lng.
CREATE TABLE IF NOT EXISTS locations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    lat         REAL    NOT NULL,
    lng         REAL    NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Table: edges
-- Stores weighted edges (roads) between locations.
CREATE TABLE IF NOT EXISTS edges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_node   TEXT    NOT NULL,
    to_node     TEXT    NOT NULL,
    distance    REAL    NOT NULL,  -- Distances in Kilometers (KM)
    FOREIGN KEY (from_node) REFERENCES locations(name),
    FOREIGN KEY (to_node)   REFERENCES locations(name)
);

CREATE TABLE IF NOT EXISTS route_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source          TEXT    NOT NULL,
    destination     TEXT    NOT NULL,
    delivery_points TEXT    NOT NULL,
    optimized_route TEXT    NOT NULL,
    total_distance  REAL    NOT NULL,
    unoptimized_distance REAL NOT NULL,
    delivery_load   REAL    NOT NULL,
    vehicle_capacity REAL   NOT NULL,
    capacity_status TEXT    NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    phone       TEXT    UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Real Coordinates for Hyderabad, India
-- ============================================================
INSERT OR IGNORE INTO locations (name, lat, lng) VALUES
    ('Charminar',     17.3616, 78.4747),
    ('Banjara_Hills', 17.4165, 78.4442),
    ('Jubilee_Hills', 17.4331, 78.4037),
    ('HITEC_City',    17.4474, 78.3762),
    ('Ameerpet',      17.4344, 78.4482),
    ('Gachibowli',    17.4401, 78.3489),
    ('Kukatpally',    17.4875, 78.3953),
    ('Madhapur',      17.4483, 78.3915),
    ('Secunderabad',  17.4399, 78.4983),
    ('Somajiguda',    17.4255, 78.4582),
    ('Kondapur',      17.4611, 78.3662),
    ('Mehdipatnam',   17.3850, 78.4488),
    ('LB_Nagar',      17.3300, 78.5000),
    ('Dilsukhnagar',   17.3700, 78.4900),
    ('Miyapur',        17.5000, 78.3800),
    ('Ameerpet',       17.4344, 78.4482),
    ('Uppal',          17.4018, 78.5602),
    ('Tarnaka',        17.4287, 78.5372),
    ('Begumpet',       17.4447, 78.4664);

-- ============================================================
-- Accurate Road Distances (approximate road KM)
-- ============================================================
INSERT OR IGNORE INTO edges (from_node, to_node, distance) VALUES
    ('Charminar',      'Banjara_Hills', 8.5),
    ('Charminar',      'Jubilee_Hills', 12.2),
    ('Charminar',      'Mehdipatnam', 6.4),
    ('Charminar',      'Dilsukhnagar', 4.5),
    ('Charminar',      'LB_Nagar', 8.0),

    ('Banjara_Hills',  'Jubilee_Hills', 5.4),
    ('Banjara_Hills',  'Ameerpet', 3.2),
    ('Banjara_Hills',  'Somajiguda', 2.8),
    ('Banjara_Hills',  'Mehdipatnam', 4.0),

    ('Jubilee_Hills',  'Gachibowli', 7.5),
    ('Jubilee_Hills',  'Madhapur', 4.2),
    ('Jubilee_Hills',  'HITEC_City', 6.0),

    ('HITEC_City',     'Madhapur', 2.5),
    ('HITEC_City',     'Kondapur', 3.1),
    ('HITEC_City',     'Kukatpally', 6.2),
    ('HITEC_City',     'Gachibowli', 5.5),

    ('Ameerpet',       'Kukatpally', 7.8),
    ('Ameerpet',       'Somajiguda', 2.5),
    ('Ameerpet',       'Mehdipatnam', 5.0),

    ('Gachibowli',     'Secunderabad', 18.5),
    ('Gachibowli',     'Madhapur', 6.1),
    ('Gachibowli',     'Kondapur', 3.8),

    ('Kukatpally',     'Somajiguda', 11.2),
    ('Kukatpally',     'Miyapur', 4.8),
    ('Kukatpally',     'Madhapur', 7.0),

    ('Madhapur',       'Kondapur', 5.0),
    ('Madhapur',       'Somajiguda', 5.8),

    ('Secunderabad',   'Kondapur', 15.5),
    ('Secunderabad',   'Ameerpet', 9.5),

    ('Somajiguda',     'Mehdipatnam', 6.0),

    ('Mehdipatnam',    'LB_Nagar', 11.5),

    ('LB_Nagar',       'Dilsukhnagar', 3.5),

    ('Miyapur',        'Kondapur', 7.2),
    ('Miyapur',        'HITEC_City', 9.0),

    -- Reverse / Bi-directional Edges
    ('Banjara_Hills',  'Charminar', 8.5),
    ('Jubilee_Hills',  'Charminar', 12.2),
    ('Mehdipatnam',    'Charminar', 6.4),
    ('Dilsukhnagar',   'Charminar', 4.5),
    ('LB_Nagar',       'Charminar', 8.0),

    ('Jubilee_Hills',  'Banjara_Hills', 5.4),
    ('Ameerpet',       'Banjara_Hills', 3.2),
    ('Somajiguda',     'Banjara_Hills', 2.8),
    ('Mehdipatnam',    'Banjara_Hills', 4.0),

    ('Gachibowli',     'Jubilee_Hills', 7.5),
    ('Madhapur',       'Jubilee_Hills', 4.2),
    ('HITEC_City',     'Jubilee_Hills', 6.0),

    ('Madhapur',       'HITEC_City', 2.5),
    ('Kondapur',       'HITEC_City', 3.1),
    ('Kukatpally',     'HITEC_City', 6.2),
    ('Gachibowli',     'HITEC_City', 5.5),

    ('Kukatpally',     'Ameerpet', 7.8),
    ('Somajiguda',     'Ameerpet', 2.5),
    ('Mehdipatnam',    'Ameerpet', 5.0),

    ('Secunderabad',   'Gachibowli', 18.5),
    ('Madhapur',       'Gachibowli', 6.1),
    ('Kondapur',       'Gachibowli', 3.8),

    ('Somajiguda',     'Kukatpally', 11.2),
    ('Miyapur',        'Kukatpally', 4.8),
    ('Madhapur',       'Kukatpally', 7.0),

    ('Kondapur',       'Madhapur', 5.0),
    ('Somajiguda',     'Madhapur', 5.8),

    ('Kondapur',       'Secunderabad', 15.5),
    ('Ameerpet',       'Secunderabad', 9.5),

    ('Mehdipatnam',    'Somajiguda', 6.0),

    ('LB_Nagar',       'Mehdipatnam', 11.5),

    ('Dilsukhnagar',   'LB_Nagar', 3.5),

    ('Kondapur',       'Miyapur', 7.2),
    ('HITEC_City',     'Miyapur', 9.0),

    -- New Routes
    ('Uppal',          'Tarnaka', 4.5),
    ('Tarnaka',        'Secunderabad', 3.0),
    ('Begumpet',       'Secunderabad', 4.0),
    ('Begumpet',       'Ameerpet', 3.0),
    ('Uppal',          'LB_Nagar', 6.0),

    ('Tarnaka',        'Uppal', 4.5),
    ('Secunderabad',   'Tarnaka', 3.0),
    ('Secunderabad',   'Begumpet', 4.0),
    ('Ameerpet',       'Begumpet', 3.0),
    ('LB_Nagar',       'Uppal', 6.0);
