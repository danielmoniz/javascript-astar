
/* global Graph, astar, ok, test, equal */

test( "Sanity Checks", function() {
  ok (typeof Graph !== "undefined", "Graph exists");
  ok (typeof astar !== "undefined", "Astar exists");
});

test( "Basic Horizontal", function() {

  var result1 = runSearch([[1],[1]], [0,0], [1,0]);
  equal (result1.text, "(1,0)", "One step down");

  var result2 = runSearch([[1],[1],[1]], [0,0], [2,0]);
  equal (result2.text, "(1,0)(2,0)", "Two steps down");

  var result3 = runSearch([[1],[1],[1],[1]], [0,0], [3,0]);
  equal (result3.text, "(1,0)(2,0)(3,0)", "Three steps down");

});

test( "Basic Vertical", function() {

  var result1 = runSearch([[1, 1]], [0,0], [0,1]);
  equal (result1.text, "(0,1)", "One step across");

  var result2 = runSearch([[1, 1, 1]], [0,0], [0,2]);
  equal (result2.text, "(0,1)(0,2)", "Two steps across");

  var result3 = runSearch([[1, 1, 1, 1]], [0,0], [0,3]);
  equal (result3.text, "(0,1)(0,2)(0,3)", "Three steps across");

});

test( "Basic Weighting", function() {

  var result1 = runSearch([[1, 1], [2, 1]], [0,0], [1,1]);
  equal (result1.text, "(0,1)(1,1)", "Takes less weighted path");

  var result2 = runSearch([[1, 2], [1, 1]], [0,0], [1,1]);
  equal (result2.text, "(1,0)(1,1)", "Takes less weighted path");

});

test( "Pathfinding", function() {
  var result1 = runSearch([
      [1,1,1,1],
      [0,1,1,0],
      [0,0,1,1]
  ], [0,0], [2,3]);

  equal (result1.text, "(0,1)(1,1)(1,2)(2,2)(2,3)", "Result is expected");
});

test( "isNeighborStopPoint", function() {

  var currentNode = { x: 0, y: 0};
  var neighbor = { x: 0, y: 1 };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, false, "Return false if currentNode is not a stop point or partial stop point");

  var currentNode = { x: 0, y: 0, stopPoint: true };
  var neighbor = { x: 0, y: 1 };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, false, "Return false if currentNode is a stop point but not partial stop point");

  var currentNode = { x: 0, y: 0 };
  var neighbor = { x: 0, y: 1, stopPoint: true };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, true, "Return true if neighbor is stop point");

  var currentNode = { x: 0, y: 0, stopPoint: true };
  var neighbor = { x: 0, y: 1, stopPoint: true };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, true, "Return true if both currentNode and neighbor are stop points");

});

test( "isNeighborStopPoint with partial stop points", function() {

  var neighbor = { x: 0, y: 1 };
  var currentNode = { x: 0, y: 0, partialStopPoint: true };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, true, "Return true if currentNode is a stop point but lists no allowed moves");

  var neighbor = { x: 0, y: 1 };
  var allowed = { x: 7, y: 5 };
  var currentNode = { x: 0, y: 0, partialStopPoint: true, allowedMoves: allowed };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, true, "Return true if currentNode is a stop point but lists no relevant allowed moves");

  var neighbor = { x: 0, y: 1 };
  var currentNode = { x: 0, y: 0, partialStopPoint: true, allowedMoves: [neighbor] };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, false, "Return false if currentNode is a stop point but lists coordinates of neighbour");

  var neighbor = { x: 0, y: 1 };
  var allowed = [{ x: 7, y: 5 }, neighbor];
  var currentNode = { x: 0, y: 0, partialStopPoint: true, allowedMoves: allowed };
  var result1 = astar.isNeighborStopPoint(currentNode, neighbor);
  equal (result1, false, "Return false if currentNode is a stop point but lists multiple coordinates including neighbour");

});

test( "Pathfinding with stop points", function() {

  var graph = new Graph([
      [1,1,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stopPoints = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 2, stopPoints);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid stop point due to high movement value");

  var graph = new Graph([
      [1,3,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stopPoints = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 4, stopPoints);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid stop point despite traversing a high weight.");

  var graph = new Graph([
      [1,4,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stopPoints = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 4, stopPoints);
  equal (result1.text, "(1,0)(1,1)(2,1)(2,2)", "Use stop point due to overly high weights elsewhere.");

  var graph = new Graph([
      [1,1,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stopPoints = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 1, stopPoints);
  equal (result1.text, "(1,0)(1,1)(2,1)(2,2)", "Use stop point due to low movement causing no effect.");

  var graph = new Graph([
      [1,5,5],
      [5,0,1],
      [4,1,1]
  ]);
  var stopPoints = [{ x: 2, y: 1 }];
  var result1 = runSearch(graph, [0,0], [2,2], 10, stopPoints);
  equal (result1.text, "(1,0)(2,0)(2,1)(2,2)", "Stop point is more efficient when it happens on the final movement point of maxPerTurn");

  var graph = new Graph([
      [1,10,4],
      [5,0,5],
      [5,1,1]
  ]);
  var stopPoints = [{ x: 2, y: 1 }];
  var result1 = runSearch(graph, [0,0], [2,2], 10, stopPoints);
  equal (result1.text, "(0,1)(0,2)(1,2)(2,2)", "Stop point after full movement amount should jump turns value (2,1 vs 1,10)");

});

test( "Pathfinding with partial stop points", function() {

  var graph = new Graph([
      [1,3,0],
      [1,1,0],
      [0,1,1]
  ]);
  var partialStopPoints = [{ x: 1, y: 0, partialStopPoint: true } ];
  var result1 = runSearch(graph, [0,0], [2,2], 5, undefined, undefined, partialStopPoints);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid partial stop point when no allowed moves are given.");

  var graph = new Graph([
      [1,3,0],
      [1,1,0],
      [0,1,1]
  ]);
  var partialStopPoints = [{ x: 0, y: 0, partialStopPoint: true, allowedMoves: [{ x: 0, y: 1 }] } ];
  var result1 = runSearch(graph, [0,0], [2,2], 4, undefined, undefined, partialStopPoints);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid partial stop point despite traversing a high weight.");

  var graph = new Graph([
      [1,3,3],
      [1,0,1],
      [1,1,1]
  ]);
  var partialStopPoints = [{ x: 1, y: 0, partialStopPoint: true, allowedMoves: [{ x: 2, y: 0 }] } ];
  var result1 = runSearch(graph, [0,0], [2,2], 3, undefined, undefined, partialStopPoints);
  equal (result1.text, "(1,0)(2,0)(2,1)(2,2)", "Take partial stop point to avoid higher weight.");

  var graph = new Graph([
      [1,1,0],
      [0,1,2],
      [0,1,1]
  ]);
  var partialStopPoints = [{ x: 1, y: 1, partialStopPoint: true, allowedMoves: [{ x: 2, y: 1 }, { x: 1, y: 2 }] } ];
  var result1 = runSearch(graph, [0,0], [2,2], 3, undefined, undefined, partialStopPoints);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid higher weight after partial stop point provides two allowed moves.");

  var graph = new Graph([
      [1,1,0],
      [1,1,0],
      [0,1,1]
  ]);
  var partialStopPoints = [{ x: 0, y: 0, partialStopPoint: true, allowedMoves: [{ x: 0, y: 1 }] } ];
  var result1 = runSearch(graph, [0,0], [2,2], 1, undefined, undefined, partialStopPoints);
  equal (result1.text, "(1,0)(1,1)(2,1)(2,2)", "Use partial stop point due to low movement causing no effect.");

});

test( "Pathfinding with maxPerTurn", function() {

  var graph = new Graph([
      [0,5,6],
      [5,0,4],
      [4,2,2],
  ]);
  var stopPoints = [];
  var maxPerTurn = 4;

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints);
  equal (result1.text, "", "A graph made impossible through a low maxPerTurn returns an empty list");

});

test( "Pathfinding with variable maxPerTurn", function() {

  var graph = new Graph([
      [0,5,3],
      [5,0,4],
      [3,2,2],
  ]);
  var stopPoints = [];
  var maxPerTurn = [5,2];

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints);
  equal (result1.text, "", "A graph made impossible through a low maxPerTurn value returns an empty list");

  var graph = new Graph([
      [0,2,6],
      [2,0,4],
      [4,2,2],
  ]);
  var stopPoints = [{ x: 1, y: 0 }];
  var maxPerTurn = [2, 8];

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints);
  equal (result1.text, "(1,0)(2,0)(2,1)(2,2)", "maxPerTurn [2,8] does not act as [2,2] or [8,8]");

  var graph = new Graph([
      [0,2,6],
      [2,0,4],
      [4,2,2],
  ]);
  var stopPoints = [{ x: 2, y: 1 }];
  var maxPerTurn = [8, 2];

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints);
  equal (result1.text, "(1,0)(2,0)(2,1)(2,2)", "maxPerTurn [8,2] does not act as [2,2] or [8,8]");

  var graph = new Graph([
      [0,2,3],
      [2,0,2],
      [3,0,4],
      [4,2,1],
  ]);
  var stopPoints = [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  var maxPerTurn = [2, 3, 5];

  var result1 = runSearch(graph, [0,0], [3,2], maxPerTurn, stopPoints);
  equal (result1.text, "(1,0)(2,0)(3,0)(3,1)(3,2)", "maxPerTurn [2,3,5] acts as [2,3,5,5,...]");

});

test( "Pathfinding with barriers", function() {

  var graph = new Graph([
      [0,3,3],
      [1,0,3],
      [1,1,1],
  ]);

  var barrier = { start: { x: 0, y: 0 }, blocked: { x: 1, y: 0 } };
  var stopPoints = [];
  var maxPerTurn = 10;

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints, [barrier]);
  equal (result1.text, "(0,1)(0,2)(1,2)(2,2)", "Algorithm picks longer path to avoid barrier");

  var graph = new Graph([
      [0,3,3],
      [1,0,3],
      [1,1,1],
  ]);

  var barrier = { start: { x: 1, y: 0 }, blocked: { x: 0, y: 0 } };
  var stopPoints = [];
  var maxPerTurn = 10;

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints, [barrier]);
  equal (result1.text, "(1,0)(2,0)(2,1)(2,2)", "Algorithm ignores barrier in wrong direction");

  var graph = new Graph([
      [0,1,1],
      [1,0,1],
      [1,1,1],
  ]);

  var barriers = [
    { start: { x: 0, y: 0 }, blocked: { x: 0, y: 1 } },
    { start: { x: 0, y: 0 }, blocked: { x: 1, y: 0 } },
  ];
  var stopPoints = [];
  var maxPerTurn = 10;

  var result1 = runSearch(graph, [0,0], [2,2], maxPerTurn, stopPoints, barriers);
  equal (result1.text, "", "Algorithm is blocked by multiple barriers");


});

test( "Diagonal Pathfinding", function() {
  var graph = new Graph([
      [1,1,1,1],
      [0,1,1,0],
      [0,0,1,1]
  ], { diagonal: true});
  var result1 = runSearch(graph, [0,0], [2,3]);

  equal (result1.text, "(1,1)(2,2)(2,3)", "Result is expected");
});

test( "Pathfinding to closest", function() {
  var result1 = runSearch([
      [1,1,1,1],
      [0,1,1,0],
      [0,0,1,1]
  ], [0,0], [2,1], undefined, [], [], [], {closest: true});

  equal (result1.text, "(0,1)(1,1)", "Result is expected - pathed to closest node");

  var result2 = runSearch([
      [1,0,1,1],
      [0,1,1,0],
      [0,0,1,1]
  ], [0,0], [2,1], undefined, [], [], [], {closest: true});

  equal (result2.text, "", "Result is expected - start node was closest node");

  var result3 = runSearch([
      [1,1,1,1],
      [0,1,1,0],
      [0,1,1,1]
  ], [0,0], [2,1], undefined, [], [], [], {closest: true});

  equal (result3.text, "(0,1)(1,1)(2,1)", "Result is expected - target node was reachable");
});

test( "GPS Pathfinding", function() {
  var data = [
    {name: "Paris", lat: 48.8567, lng: 2.3508},
    {name: "Lyon", lat: 45.76, lng: 4.84},
    {name: "Marseille", lat: 43.2964, lng: 5.37},
    {name: "Bordeaux", lat: 44.84, lng: -0.58},
    {name: "Cannes", lat: 43.5513, lng: 7.0128},
    {name: "Toulouse", lat: 43.6045, lng: 1.444},
    {name: "Reims", lat: 49.2628, lng: 4.0347}
  ],
  links = {
    "Paris": ["Lyon", "Bordeaux", "Reims"],
    "Lyon": ["Paris", "Marseille"],
    "Marseille": ["Lyon", "Cannes", "Toulouse"],
    "Bordeaux": ["Toulouse", "Paris"],
    "Cannes": ["Marseille"],
    "Toulouse": ["Marseille", "Bordeaux"],
    "Reims": ["Paris"]
  };

  function CityGraph(data, links) {
    this.nodes = [];
    this.links = links;
    this.cities = {};

    for (var i = 0; i < data.length; ++i) {
      var city = data[i],
          obj = new CityNode(city.name, city.lat, city.lng);

      if (this.nodes.indexOf(obj) == -1) {
          this.nodes.push(obj);
      }

      this.cities[obj.name] = obj;
    }
  }

  CityGraph.prototype.neighbors = function (node) {
    var neighbors = [],
        ids = this.links[node.name];
    for (var i = 0, len = ids.length; i < len; ++i) {
      var name = ids[i],
          neighbor = this.cities[name];
      neighbors.push(neighbor);
    }
    return neighbors;
  };

  function CityNode(name, lat, lng) {
    this.name = name;
    this.lat = lat;
    this.lng = lng;
    this.longRad = this.lng * Math.PI / 180;
    this.latRad = this.lat * Math.PI / 180;
  }
  CityNode.prototype.weight = 1;
  CityNode.prototype.toString = function() {
      return "[" + this.name + " (" + this.lat + ", " + this.lng + ")]";
  };
  CityNode.prototype.isWall = function() {
      return this.weight === 0;
  };
  // Heuristic function
  CityNode.prototype.GPSDistance = function(city) {
      var x = (city.longRad - this.longRad) * Math.cos((this.latRad + city.latRad)/2),
          y = city.latRad - this.latRad,
          res = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) * 6371;
      return res;
  };
  // Real cost function
  CityNode.prototype.getCost = function(city) {
    // Re-use heuristic function for now
    // TODO: Determine the real distance between cities (from another data set)
    return this.GPSDistance(city);
  };

  var graph = new CityGraph(data, links);

  var start = graph.cities["Paris"],
      end = graph.cities["Cannes"];

  var GPSheuristic = function(node0, node1) {
    return node0.GPSDistance(node1);
  };

  var result = astar.search(graph, start, end, undefined, [], [], undefined, {heuristic: GPSheuristic});
  equal(result.length, 3, "Cannes is 3 cities away from Paris");
  equal(result[0].name, "Lyon", "City #1 is Lyon");
  equal(result[1].name, "Marseille", "City #2 is Marseille");
  equal(result[2].name, "Cannes", "City #3 is Cannes");
});

test('Find reachable locations', function() {
  var result = runReachable([
      [0,0],
      [0,1],
      [2,1],
  ], [0,0], 5);

  ok(resultConsistsOf([], result.result), 
    'Returns an empty list if no other nodes can be reached');

  var result = runReachable([
      [0,1],
      [4,1],
      [2,1],
  ], [0,0], 5);

  ok(resultConsistsOf([[0,1], [1,0], [1,1], [2,0], [2,1]], result.result), 
    'Can reach location that (from the most direct path) looks as if it cannot be reached');

  var result = runReachable([
      [0,1,1,1],
      [1,1,1,1],
      [1,1,1,1],
      [1,1,1,1]
  ], [0,0], 2);

  ok(resultConsistsOf([[0,1], [0,2], [1,0], [1,1], [2,0]], result.result),
    'Cannot reach locations that out of movement range');

  var result = runReachable([
      [0,1],
      [4,1],
      [3,1],
  ], [0,0], 5);

  ok(resultConsistsOf([[0,1], [1,0], [1,1], [2,1]], result.result),
    'Cannot reach location that is 1 movement away from being reached');

  var stopPoints = [{ x:0, y:1 }, { x:1, y:0 },];
  var result = runReachable([
      [0,1,1],
      [1,1,1],
      [1,1,1],
  ], [0,0], 5, stopPoints);

  ok(resultConsistsOf([[0,1], [1,0]], result.result),
    'Cannot reach locations that are past stop points');

  var stopPoints = getStopPointsFromPairs([[0,2], [2,0]]);
  var result = runReachable([
      [0,1,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], 5, stopPoints);

  ok(resultConsistsOf([[0,1], [0,2], [1,0], [2,0]], result.result),
    'Can move before a stop point but cannot move past it');

  var stopPoints = [{ x: 0, y: 0 }];
  var result = runReachable([
      [0,1,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], 2, stopPoints);

  ok(resultConsistsOf([[0,1], [0,2], [1,0], [2,0]], result.result),
    'Can reach other spaces when starting on a stop point');

  var turns = 2;
  var result = runReachable([
      [0,2,2,2],
      [2,2,2,2],
      [2,2,2,2],
      [2,2,2,2]
  ], [0,0], 2, [], turns);

  ok(resultConsistsOf([[0,1], [0,2], [1,0], [1,1], [2,0]], result.result),
    'Passing in a higher turns value calculates reachable locations in that many turns');

  var stopPoints = getStopPointsFromPairs([[0,1], [0,2], [1,0], [2,0]]);
  var turns = 2;
  var result = runReachable([
      [0,1,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], 5, stopPoints, turns);

  ok(resultConsistsOf([[0,1], [0,2], [1,0], [2,0]], result.result),
    'With turns > 1, can hit multiple stop points');

  var stopPoints = [];
  var turns = 1;
  var maxPerTurn = [3, 2];
  var result = runReachable([
      [0,0,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], maxPerTurn, stopPoints, turns);

  ok(resultConsistsOf([[1,0], [2,0], [2,1]], result.result),
    'Calculates one turn-reachable locations based on only the first value of a complex maxPerTurn value');

  var stopPoints = [];
  var turns = 2;
  var maxPerTurn = [3, 2];
  var result = runReachable([
      [0,0,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], maxPerTurn, stopPoints, turns);

  ok(resultConsistsOf([[1,0], [2,0], [2,1], [2,2], [1,2]], result.result),
    'Calculates two turn-reachable locations based on the first two values of a complex maxPerTurn value');

  var stopPoints = [];
  var maxPerTurn = 0;
  var result = runReachable([
      [0,0,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], maxPerTurn, stopPoints);

  ok(resultConsistsOf([], result.result),
    'Returns an empty list if maxPerTurn is 0');

  var stopPoints = [];
  var maxPerTurn = [0, 1];
  var turns = 2;
  var result = runReachable([
      [0,0,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], maxPerTurn, stopPoints, turns);

  ok(resultConsistsOf([[1,0]], result.result),
    'Skips first turn of movement if first maxPerTurn value is 0');

  var stopPoints = [];
  var maxPerTurn = [1, 0];
  var turns = 2;
  var result = runReachable([
      [0,0,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], maxPerTurn, stopPoints, turns);

  ok(resultConsistsOf([[1,0]], result.result),
    'Skips second turn of movement if second maxPerTurn value is 0');

  var stopPoints = [];
  var maxPerTurn = [1, 0];
  var turns = 2;
  var result = runReachable([
      [0,0,1],
      [1,0,1],
      [1,1,1],
  ], [0,0], maxPerTurn, stopPoints, turns, []);

  ok(resultConsistsOf([[1,0]], result.result),
    'Works as normal if barriers is specified as an empty list');

  var barrier = {
    start: { x: 0, y: 0 }, blocked: { x: 0, y: 1 },
  };
  var stopPoints = [];
  var maxPerTurn = 5;
  var turns = 1;
  var result = runReachable([
      [0,1,1],
      [5,0,1],
      [5,5,1],
  ], [0,0], maxPerTurn, stopPoints, turns, [barrier]);

  ok(resultConsistsOf([[1,0]], result.result),
    'Barrier limits the reachable tiles');

  var barrier = {
    start: { x: 0, y: 1 }, blocked: { x: 0, y: 0 },
  };
  var stopPoints = [];
  var maxPerTurn = 5;
  var turns = 1;
  var result = runReachable([
      [0,1,0],
      [0,0,0],
      [0,0,0],
  ], [0,0], maxPerTurn, stopPoints, turns, [barrier]);

  ok(resultConsistsOf([[0,1]], result.result),
    'One-way barrier in wrong direction does not limit the reachable tiles');

  var barriers = [
    {
      start: { x: 0, y: 1 }, blocked: { x: 0, y: 2 },
    },
    {
      start: { x: 1, y: 0 }, blocked: { x: 2, y: 0 },
    },
  ]
  var stopPoints = [];
  var maxPerTurn = 5;
  var turns = 1;
  var result = runReachable([
      [0,1,1],
      [1,0,0],
      [1,0,0],
  ], [0,0], maxPerTurn, stopPoints, turns, barriers);

  ok(resultConsistsOf([[0,1], [1,0]], result.result),
    'Multiple barriers limit the reachable tiles');

});

test( "Score (creation)", function() {

  var score = new Score(0, 0);
  equal(score.valueOf(), 0, 'score value is equal to score input when maxPerTurn is 0');

  var score = new Score(3, 0);
  equal(score.valueOf(), 3, 'score value is equal to score input when maxPerTurn is 0');

  var score = new Score(96, false);
  equal(score.valueOf(), 96, 'score value is equal to score input when maxPerTurn is false');

  var score = new Score(2567, undefined);
  equal(score.valueOf(), 2567, 'score value is equal to score input when maxPerTurn is undefined');

  var score = new Score(1000001, undefined);
  equal(score.valueOf(), 1000001, 'score value is still equal to massive score input when maxPerTurn is undefined');

  throws(function() {
    var score = new Score(undefined, false);
  }, Error('BadParam'), 'throws error when fed value of undefined for score');

  var maxPerTurn = [8, 4];
  var score = new Score(12, maxPerTurn);
  ok(true, 'Score class can handle array values for maxPerTurn');

  var maxPerTurn = [8, 4, 6];
  var score = new Score(19, maxPerTurn);
  ok(true, 'Score class can handle array values for maxPerTurn');

  var maxPerTurn = [0, 2, 5];
  var score = new Score(0, maxPerTurn);
  equal(score.valueOf(), 0, 'A score with an initial maxPerTurn element of 0 and a zero input will still evaluate to 0');

  var maxPerTurn = [0, 2, 5];
  var score = new Score(1, maxPerTurn);
  equal(score.valueOf(), 1000001, 'A score with an initial maxPerTurn element of 0 will bump turn count');

  var maxPerTurn = [2, 0, 5];
  var score = new Score(3, maxPerTurn);
  equal(score.valueOf(), 2000001, 'A score with a later maxPerTurn element of 0 will bump turn count');

});

test( "Score (valueOf)", function() {

  var score = new Score(0, 10);
  equal(score.valueOf(), 0, 'score valueOf is zero when score input is zero');

  var score = new Score(5, 10);
  equal(score.valueOf(), 5, 'score valueOf equals the score input when the input is less than maxPerTurn');

  var score = new Score(10, 10);
  equal(score.valueOf(), 10, 'score valueOf equals the score input when the input is equal to maxPerTurn');

  var score = new Score(11, 10);
  equal(score.valueOf(), 1000001, 'score valueOf becomes huge when score input is greater than maxPerTurn');

  var score = new Score(22, 5);
  equal(score.valueOf(), 4000002, 'score valueOf becomes multiples of huge when score input is much greater than maxPerTurn');

  var score = new Score(0, 10, 'stop point');
  equal(score.valueOf(), 10, 'score value rounds up to maxPerTurn due to stop point');

  var score = new Score(1, 10, 'stop point');
  equal(score.valueOf(), 10, 'score value rounds up to maxPerTurn due to stop point');

  var score = new Score(11, 10, 'stop point');
  equal(score.valueOf(), 1000010, 'score value rounds up to maxPerTurn due to stop point if score input is higher than maxPerTurn');

  var score = new Score(10, 10, 'stop point');
  equal(score.valueOf(), 10, 'score value is not rounded up due to stop point if score == extraWeight');

  var score = new Score(4, undefined, 'stop point');
  equal(score.valueOf(), 1000000, 'score value rounds up to massive value due to stop point when maxPerTurn is undefined');

  var maxPerTurn = [8, 8];
  var score = new Score(5, maxPerTurn);
  equal(score.valueOf(), 5, 'score valueOf equals the score input when input is lower than all maxPerTurn values');

  var maxPerTurn = [8, 2];
  var score = new Score(5, maxPerTurn);
  equal(score.valueOf(), 5, 'score valueOf equals the score input when input is higher than second maxPerTurn value');

  var maxPerTurn = [5, 7];
  var score = new Score(6, maxPerTurn);
  equal(score.valueOf(), 1000001, 'score valueOf turns count is bumped up if score input is higher than first maxPerTurn value');

  var maxPerTurn = [7, 4];
  var score = new Score(8, maxPerTurn, 'stop point');
  equal(score.valueOf(), 1000004, 'score valueOf rounds up to second maxPerTurn value if hitting a stop point after 1 turn');

  var maxPerTurn = [3, 6];
  var score = new Score(10, maxPerTurn, 'stop point');
  equal(score.valueOf(), 2000006, 'score valueOf rounds up to second maxPerTurn value if hitting a stop point after 2 or more turns');

  var maxPerTurn = [3, 6];
  var score = new Score(70, maxPerTurn, 'stop point');
  equal(score.valueOf(), 12000006, 'score valueOf rounds up to second maxPerTurn value if hitting a stop point after more than 2 turns');

  var maxPerTurn = [4, 8];
  var score = new Score(13, maxPerTurn);
  equal(score.valueOf(), 2000001, 'score valueOf accounts for ascending maxPerTurn values when score input is higher than sum of those values');

  var maxPerTurn = [8, 4];
  var score = new Score(13, maxPerTurn);
  equal(score.valueOf(), 2000001, 'score valueOf accounts for descending maxPerTurn values when score input is higher than sum of those values');

  var maxPerTurn = [1, 2, 3];
  var score = new Score(3, maxPerTurn);
  equal(score.valueOf(), 1000002, 'score valueOf accepts low score input values with >2 maxPerTurn values');

  var maxPerTurn = [8, 4, 5];
  var score = new Score(18, maxPerTurn);
  equal(score.valueOf(), 3000001, 'score valueOf accounts for >2 maxPerTurn values when score input is higher than sum of those values');

  var maxPerTurn = [1, 2, 3];
  var score = new Score(6, maxPerTurn);
  equal(score.valueOf(), 2000003, 'score valueOf accounts for >2 maxPerTurn values when score input is equal to sum of those values');

  var maxPerTurn = [7, 2, 5];
  var score = new Score(10, maxPerTurn, 'stop point');
  equal(score.valueOf(), 2000005, 'score valueOf rounds up to third maxPerTurn value if hitting a stop point after more than 3 turns');

  var maxPerTurn = [7, 2, 5, 4, 5, 6, 6, 3];
  var score = new Score(36, maxPerTurn, 'stop point');
  equal(score.valueOf(), 7000003, 'score valueOf rounds up to nth maxPerTurn value if hitting a stop point after more than n turns');

});

test( "Score (comparisons)", function() {

  var score1 = new Score(3, 5);
  var score2 = new Score(6, 5);
  ok(score1 < score2, 'score with fewer turns (and more extraWeight) is less than score with more turns');

  var score1 = new Score(3, 5);
  var score2 = new Score(6, 5);
  ok(score1 <= score2, 'score with fewer turns (and more extraWeight) is less than or equal to than score with more turns');

  var score1 = new Score(3, 5);
  var score2 = new Score(3, 5);
  ok(score1.valueOf() == score2.valueOf(), 'scores of equal inputs have equal values (valueOf())');
  equal(score1, 3, 'a score is equal to its value');

  var score1 = new Score(3, 5);
  var score2 = new Score(3, 5);
  ok(score1 != score2, 'scores of equal inputs are not equal by comparison');

  var score1 = new Score(3, 5);
  var score2 = new Score(3, 5);
  ok(score1 >= score2, 'scores of equal inputs are equal to or greater than each other');

});

test( "Score (operations)", function() {

  var score1 = new Score(1, 5);
  var score2 = new Score(2, 5);
  equal(score1 + score2, 3, 'adding scores is as normal if both scores are far below their maxPerTurn values');

  var score1 = new Score(3, 5);
  var score2 = new Score(6, 5);
  equal(score1 + score2, 1000004, 'adding scores is as normal if addition does not bump value of turns');

  var score1 = new Score(3, 5);
  var score2 = new Score(4, 5);
  equal(score1 + score2, 7, 'addition does not automatically bump the turns amount (seen through huge number)');

  var score1 = new Score(9, 5);
  var score2 = new Score(9, 5);
  equal(score1 + score2, 2000008, 'addition does not automatically bump the turns amount with already huge numbers');

  var score1 = new Score(3, 5);
  var score2 = new Score(4, 5);
  equal(new Score(score1 + score2, 5), 1000002, 'turns value is bumped only when creating a new score object');

  var score = new Score(3, 5);
  var num = 4;
  equal(score + num, 7, "a score added with a number acts as two numbers added");

  var score = new Score(2, 5);
  var num = 4;
  equal(num / score, 2, "a number divided by a score acts as normal");

  var score = new Score(2, 5);
  var num = 4;
  equal(score / num, 0.5, "a score divided by a number acts as normal");

  var score = new Score(2, 5);
  var num = 4;
  equal(score * num, 8, "a score multiplied by a number acts as two numbers being multiplied");

});

test( "Score.add() - bad parameters", function() {

  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = 0;
  throws(function() {
    var result = score.add(addition);
  }, Error('BadParam'), 'Does not accept the addition of 0');

  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = false;
  throws(function() {
    var result = score.add(addition);
  }, Error('BadParam'), 'Does not accept the addition of false');

  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = undefined;
  throws(function() {
    var result = score.add(addition);
  }, Error('BadParam'), 'Does not accept the addition of undefined');

  var maxPerTurn = [2, 5];
  var score = new Score(0, maxPerTurn);
  var addition = undefined;
  throws(function() {
    var result = score.add(addition);
  }, Error('BadParam'), 'Does not accept a falsy value when the score has a variable maxPerTurn');

  var maxPerTurn = 5;
  var score = new Score(0, maxPerTurn);
  var addition = -0.5;
  throws(function() {
    var result = score.add(addition);
  }, Error('BadParam'), 'Does not accept negative numbers');

});

test( "Score.add() with simple maxPerTurn values", function() {

  var maxPerTurn = 0;
  var score = new Score(0, maxPerTurn);
  var addition = 3579;
  var result = score.add(addition);
  equal(result, 3579, 'addition of a number to a zero score when maxPerTurn is zero acts as normal');
  var addition = 2666;
  var result = result.add(addition);
  equal(result, 6245, 'addition of a number to a positive score when maxPerTurn is zero acts as normal');

  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = 5;
  var result = score.add(addition);
  equal(result, 1000001, 'addition of a value larger than maxPerTurn should increment turn count');

  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = 13;
  var result = score.add(addition);
  equal(result, 3000001, 'addition of a value more than double the maxPerTurn value should bump turn count multiple times');
  var result = result.add(addition);
  equal(result, 6000002, 'addition of a second value more than double the maxPerTurn value should bump turn count multiple times');

  // test 3 cases of totalExtraWeight (as compared to maxPerTurnValue)
  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = 1;
  var result = score.add(addition); // less than
  equal(result.valueOf(), 1, 'addition of a value such that the total extra weight is less than the maxPerTurn value should act as normal addition');
  var addition = 3;
  var result = result.add(addition); // equal to
  equal(result.valueOf(), 4, 'addition of a value such that the total extra weight equals the maxPerTurn value should act as normal addition');
  var addition = 1;
  var result = result.add(addition); // greater than
  equal(result.valueOf(), 1000001, 'addition of a value such that the total extra weight is greater than the maxPerTurn value should bump the turn count');

  var maxPerTurn = 4;
  var score = new Score(0, maxPerTurn);
  var addition = new Score(5, maxPerTurn);
  var result = score.add(addition);
  equal(result.valueOf(), 1000001, 'addition of a zero score and a positive score should work intuitively (both properties added)');
  var addition = new Score(2000004);
  var result = result.add(addition);
  equal(result.valueOf(), 4000001, 'addition of two positive scores should work intuitively (both properties added, remainder handled)');

});

test( "Score.add() with variable maxPerTurn values", function() {

  var maxPerTurn = [2, 5];
  var score = new Score(0, maxPerTurn);
  var addition = 1;
  var result = score.add(addition);
  equal(result, 1, 'addition of a small positive value to a zero score should add as normal');
  var addition = 1;
  var result = score.add(addition);
  equal(result, 1, 'addition of a small positive value to a non-zero score should add as normal');

  var maxPerTurn = [2, 5];
  var score = new Score(0, maxPerTurn);
  var addition = 2;
  var result = score.add(addition);
  equal(result.valueOf(), 2, 'addition of a value equal to the first maxPerTurn value should NOT increment turn count');

  var maxPerTurn = [2, 5];
  var score = new Score(0, maxPerTurn);
  var addition = 3;
  var result = score.add(addition);
  equal(result.valueOf(), 1000001, 'addition of a value larger than the first maxPerTurn value should increment turn count');
  var result = result.add(addition);
  equal(result.valueOf(), 1000004, 'addition of a second value smaller than the second maxPerTurn should not bump turn count');
  var result = result.add(addition);
  equal(result.valueOf(), 2000002, 'addition of a third value totalling more than the second maxPerTurn should bump turn count');

  var maxPerTurn = [14, 5];
  var score = new Score(0, maxPerTurn);
  var addition = 13;
  var result = score.add(addition);
  equal(result.valueOf(), 13, 'addition of a value smaller than the (large) first maxPerTurn value should not bump turn count');
  var result = result.add(addition);
  equal(result.valueOf(), 3000002, 'addition of a second value totalling more than double the second maxPerTurn should bump turn count twice');
  var result = result.add(addition);
  equal(result.valueOf(), 5000005, 'addition of a third value totalling more than double the second (final) maxPerTurn should bump turn count twice');

  var score = new Score(1, 4);
  var addition = new Score(2, 5);
  var result = score.add(addition);
  equal(result.valueOf(), 3, 'addition of two scores with different maxPerTurn values should work as normal score addition');

  var maxPerTurn = [0, 2, 5];
  var score = new Score(0, maxPerTurn);
  var addition = 2;
  var result = score.add(addition);
  equal(result.valueOf(), 1000002, 'addition of a score with an initial maxPerTurn element of 0 will bump turn count');

  var maxPerTurn = [2, 0, 5];
  var score = new Score(1, maxPerTurn);
  var addition = 2;
  var result = score.add(addition);
  equal(result.valueOf(), 2000001, 'addition of a score with a later maxPerTurn element of 0 will bump turn count');

});

test( "Score.addSingleSpace()", function() {

  var maxPerTurn = [2, 5];
  var score1 = new Score(0, maxPerTurn);
  var score2 = score1.addSingleSpace(1);
  equal(score2.turns, 0, 'addition of a sufficiently small value should keep turns value the same');
  equal(score2.extraWeight, 1, 'addition of a sufficiently small value should increment extraWeight only');

  var maxPerTurn = [4, 5];
  var score1 = new Score(1, maxPerTurn);
  var score2 = score1.addSingleSpace(3);
  equal(score2.turns, 0, 'addition of a sufficiently small value to maximize extraWeight should keep turns value the same');
  equal(score2.extraWeight, 4, 'addition of a sufficiently small value to maximize extraWeight should keep turns value the same should increase extraWeight only');

  var maxPerTurn = 4;
  var score1 = new Score(0, maxPerTurn);
  var score2 = score1.addSingleSpace(5);
  equal(score2, false, 'addition of a value larger than maxPerTurn should return false');

  var maxPerTurn = [4, 7, 9];
  var score1 = new Score(0, maxPerTurn);
  var score2 = score1.addSingleSpace(10);
  equal(score2, false, 'addition of a value larger than all maxPerTurn values should return false');

  var maxPerTurn = [4, 7, 9];
  var score1 = new Score(0, maxPerTurn);
  var score2 = score1.addSingleSpace(9);
  equal(score2.turns, 2, 'addition of a value larger than early maxPerTurn values should increase turns until a maxPerTurn value is sufficient');
  equal(score2.extraWeight, 9, 'addition of a value larger than early maxPerTurn values should set extraWeight to the addition input');

  var maxPerTurn = 4;
  var score1 = new Score(2, maxPerTurn);
  var score2 = score1.addSingleSpace(3);
  equal(score2.turns, 1, 'addition of a large enough value should increment the turns');
  equal(score2.extraWeight, 3, 'addition of a large enough value should increment the turns should set the extraWeight to the addition input');

  var maxPerTurn = [4, 5];
  var score1 = new Score(4, maxPerTurn);
  var score2 = score1.addSingleSpace(1);
  equal(score2.turns, 1, 'addition of a small value when extra weight is maximized should increment the turns');
  equal(score2.extraWeight, 1, 'addition of a small value when extra weight is maximized should increment the turns should reset extraWeight to 1');

  var maxPerTurn = [2, 5];
  var score1 = new Score(2, maxPerTurn);
  var score2 = score1.addSingleSpace(5, 'stop point');
  equal(score2.turns, 1, 'addition of a value equal to a maxPerTurn value should cause turns to increase by only 1');
  equal(score2.extraWeight, 5, 'addition of a value equal to a maxPerTurn value should cause extraWeight == maxPerTurn[i]');

  var maxPerTurn = 4;
  var score1 = new Score(0, maxPerTurn);
  throws(function() {
    var score2 = score1.addSingleSpace(undefined);
  }, Error('BadParam'), "An undefined 'addition' parameter throws an error");

  var score1 = new Score(0, 4);
  throws(function() {
    var score2 = score1.addSingleSpace(new Score(1));
  }, Error('BadParam'), "Passing a Score as the 'addition' parameter throws an error");

});

function getStopPointsFromPairs(pairs) {
  var stopPoints = [];
  for (var i in pairs) {
    var stopPoint = { x: pairs[i][0], y: pairs[i][1] };
    stopPoints.push(stopPoint);
  }
  return stopPoints;
}

function resultConsistsOf(nodeList, array) {
  if (nodeList.length != array.length) {
      console.log("list should be:");
      console.log(nodeList);
      console.log("list is:");
      console.log(array);
    return false;
  }
  for (var i in nodeList) {
    if (!nodeInResult(nodeList[i], array)) {
      console.log("list should be:");
      console.log(nodeList);
      console.log("list is:");
      console.log(array);
      return false;
    }
  }
  return true;
}

function nodeInResult(pair, array) {
  for (var i in array) {
    if (pair[0] == array[i].x && pair[1] == array[i].y) {
      return true;
    }
  }

  return false;
}

function runSearch(graph, start, end, maxPerTurn, stopPoints, barriers, partialStopPoints, options) {
  if (!(graph instanceof Graph)) {
    graph = new Graph(graph);
  }
  start = graph.grid[start[0]][start[1]];
  end = graph.grid[end[0]][end[1]];
  var sTime = new Date(),
    result = astar.search(graph, start, end, maxPerTurn, stopPoints, barriers, partialStopPoints, options),
    eTime = new Date();
  return {
    result: result,
    text: pathToString(result),
    time: (eTime - sTime)
  };
}

function runReachable(graph, start, maxPerTurn, stopPoints, turns, barriers, partialStopPoints) {
  if (!(graph instanceof Graph)) {
    graph = new Graph(graph);
  }
  start = graph.grid[start[0]][start[1]];
  var sTime = new Date(),
    result = astar.findReachablePoints(graph, start, maxPerTurn, stopPoints, turns, barriers),
    eTime = new Date();
  return {
    result: result,
    text: pathToString(result),
    time: (eTime - sTime)
  };
}

function pathToString(result) {
  return result.map(function(node) {
    return "(" + node.x + "," + node.y + ")";
  }).join("");
}

// // https://gist.github.com/bgrins/581352
// function runBasic() {
//     var graph = new Graph([
//         [1,1,1,1],
//         [0,1,1,0],
//         [0,0,1,1]
//     ]);
//     var start = graph.grid[0][0];
//     var end = graph.grid[1][2];
//     var result = astar.search(graph, start, end);

//     return "<pre>" + result.join(", ") + "</pre>";
// }

// $(function() {
//     $("#runall").click(function() {

//         var result1 = runTest([
//             [1,1,1,1],
//             [0,1,1,0],
//             [0,0,1,1]
//         ], [0,0], [2,3]);

//         $("#test-output").append(result1.text);
//         $("#test-output").append(runBasic());
//         return false;
//     });
// });

