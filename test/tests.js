
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

  var result1 = runSearch([[1, 1],
                           [2, 1]], [0,0], [1,1]);
  equal (result1.text, "(0,1)(1,1)", "Takes less weighted path");

  var result2 = runSearch([[1, 2],
                           [1, 1]], [0,0], [1,1]);
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

test( "Pathfinding with stop points", function() {

  var graph = new Graph([
      [1,1,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stop_points = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 2, stop_points);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid stop point due to high movement value");

  var graph = new Graph([
      [1,3,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stop_points = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 4, stop_points);
  equal (result1.text, "(0,1)(1,1)(2,1)(2,2)", "Avoid stop point despite traversing a high weight.");

  var graph = new Graph([
      [1,4,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stop_points = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 4, stop_points);
  equal (result1.text, "(1,0)(1,1)(2,1)(2,2)", "Use stop point due to overly high weights elsewhere.");

  var graph = new Graph([
      [1,1,0],
      [1,1,0],
      [0,1,1]
  ]);
  var stop_points = [{ x: 1, y: 0 }];
  var result1 = runSearch(graph, [0,0], [2,2], 1, stop_points);
  equal (result1.text, "(1,0)(1,1)(2,1)(2,2)", "Use stop point due to low movement causing no effect.");

  var graph = new Graph([
      [1,5,5],
      [5,0,1],
      [4,1,1]
  ]);
  var stop_points = [{ x: 2, y: 1 }];
  var result1 = runSearch(graph, [0,0], [2,2], 10, stop_points);
  equal (result1.text, "(1,0)(2,0)(2,1)(2,2)", "stop point is more efficient when it happens on the final movement point of max_per_turn");

  var graph = new Graph([
      [1,10,4],
      [5,0,5],
      [5,1,1]
  ]);
  var stop_points = [{ x: 2, y: 1 }];
  var result1 = runSearch(graph, [0,0], [2,2], 10, stop_points);
  equal (result1.text, "(0,1)(0,2)(1,2)(2,2)", "stop point after full movement amount should jump turns value (2,1 vs 1,10)");

});

test( "Score (creation)", function() {

  var score = new Score(3, 0);
  equal(score.valueOf(), 3, 'score value is equal to score input when max_per_turn is 0');

  var score = new Score(96, false);
  equal(score.valueOf(), 96, 'score value is equal to score input when max_per_turn is false');

  var score = new Score(2567, undefined);
  equal(score.valueOf(), 2567, 'score value is equal to score input when max_per_turn is undefined');

});

test( "Score (valueOf)", function() {

  var score = new Score(0, 10);
  equal(score.valueOf(), 0, 'score valueOf is zero when score input is zero');

  var score = new Score(5, 10);
  equal(score.valueOf(), 5, 'score valueOf equals the score input when the input is less than max_per_turn');

  var score = new Score(10, 10);
  equal(score.valueOf(), 10, 'score valueOf equals the score input when the input is equal to max_per_turn');

  var score = new Score(11, 10);
  equal(score.valueOf(), 1000001, 'score valueOf becomes huge when score input is greater than max_per_turn');

  var score = new Score(22, 5);
  equal(score.valueOf(), 4000002, 'score valueOf becomes multiples of huge when score input is much greater than max_per_turn');

});

test( "Score (comparisons)", function() {

  var score1 = new Score(3, 5);
  var score2 = new Score(6, 5);
  ok(score1 < score2, 'score with fewer turns (and more extra_weight) is less than score with more turns');

  var score1 = new Score(3, 5);
  var score2 = new Score(6, 5);
  ok(score1 <= score2, 'score with fewer turns (and more extra_weight) is less than or equal to than score with more turns');

  var score1 = new Score(3, 5);
  var score2 = new Score(3, 5);
  ok(score1.valueOf() == score2.valueOf(), 'scores of equal inputs have equal values');

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
  equal(score1 + score2, 3, 'adding scores is as normal if both scores are far below their max_per_turn values');

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
  ], [0,0], [2,1], undefined, [], {closest: true});

  equal (result1.text, "(0,1)(1,1)", "Result is expected - pathed to closest node");

  var result2 = runSearch([
      [1,0,1,1],
      [0,1,1,0],
      [0,0,1,1]
  ], [0,0], [2,1], undefined, [], {closest: true});

  equal (result2.text, "", "Result is expected - start node was closest node");

  var result3 = runSearch([
      [1,1,1,1],
      [0,1,1,0],
      [0,1,1,1]
  ], [0,0], [2,1], undefined, [], {closest: true});

  equal (result3.text, "(0,1)(1,1)(2,1)", "Result is expected - target node was reachable");
});

function runSearch(graph, start, end, max_per_turn, stop_points, options) {
  if (!(graph instanceof Graph)) {
    graph = new Graph(graph);
  }
  start = graph.grid[start[0]][start[1]];
  end = graph.grid[end[0]][end[1]];
  var sTime = new Date(),
    result = astar.search(graph, start, end, max_per_turn, stop_points, options),
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
  CityNode.prototype.GPS_distance = function(city) {
      var x = (city.longRad - this.longRad) * Math.cos((this.latRad + city.latRad)/2),
          y = city.latRad - this.latRad,
          res = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) * 6371;
      return res;
  };
  // Real cost function
  CityNode.prototype.getCost = function(city) {
    // Re-use heuristic function for now
    // TODO: Determine the real distance between cities (from another data set)
    return this.GPS_distance(city);
  };

  var graph = new CityGraph(data, links);

  var start = graph.cities["Paris"],
      end = graph.cities["Cannes"];

  var GPSheuristic = function(node0, node1) {
    return node0.GPS_distance(node1);
  };

  var result = astar.search(graph, start, end, undefined, [], {heuristic: GPSheuristic});
  equal(result.length, 3, "Cannes is 3 cities away from Paris");
  equal(result[0].name, "Lyon", "City #1 is Lyon");
  equal(result[1].name, "Marseille", "City #2 is Marseille");
  equal(result[2].name, "Cannes", "City #3 is Cannes");
});

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

