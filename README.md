# javascript-astar-advanced

## A gaming implementation of the A* Search Algorithm in JavaScript

See a demo of the original version at http://www.briangrinstead.com/files/astar/

## Features

This is a library for pathfinding intended for use with turn-based games. It
maintains compatibility with standard pathfinding searches using graphs that
contain weights.

Additionally, it includes the ability to provide (along with the graph & start
 and end points) a max-per-turn value and a list of stop points.

* max-per-turn: The simplest use for this would be a maximum movement per turn
value.
* stop points: a list of coordinates where an entity (character, army, etc.)
  would have to stop for the rest of the turn.

Some examples as to how these could be used:

* A trap is sprung that holds a character in place for the remainder of their
turn.
* An army has an area of influence in which opposing armies must stop before
continuing on. This allows the defending player the chance to respond by
either attacking or retreating.
* A display that indicates everywhere a character can move in a single turn.
* ...and so on.

max-per-turn can also be an array of values. This represents an entity having a
variable movement speed. The last value will be used for all later movement.

Examples:

* Let max-per-turn be [1, 2, 3]. This could represent an accelerating car
  that can move 1 space on its first turn, 2 on its second, and 3 on its third.
  It then continues at a top speed of 3 indefinitely.
* Let max-per-turn be [8, 0, 4]. This could represent a runner pushing
  themselves to sprint on the first turn, then tiring and needing to rest,
  and eventually reaching a sustainable speed of 4 by the third turn and on.

Using the standard javascript-astar library to solve these problems is
impossible without taking a massive hit on performance or accepting sub-optimal
paths (if performance is too important).

## Basic Sample Usage

If you want just the basic A* search code, use code like this: http://gist.github.com/581352

	<script type='text/javascript' src='astar.js'></script>
	<script type='text/javascript'>
		var graph = new Graph([
			[1,1,1,1],
			[0,1,1,0],
			[0,0,1,1]
		]);
		var start = graph.grid[0][0];
		var end = graph.grid[1][2];
		var result = astar.search(graph, start, end);
		// result is an array containing the shortest path

		var graphDiagonal = new Graph([
			[1,1,1,1],
			[0,1,1,0],
			[0,0,1,1]
		], { diagonal: true });
		var start = graphDiagonal.grid[0][0];
		var end = graphDiagonal.grid[1][2];
		var resultWithDiagonals = astar.search(graphDiagonal, start, end);

		// Weight can easily be added by increasing the values within the graph, and where 0 is infinite (a wall)
		var graphWithWeight = new Graph([
			[1,1,2,30],
			[0,4,1.3,0],
			[0,0,5,1]
		]);
		var startWithWeight = graphWithWeight.grid[0][0];
		var endWithWeight = graphWithWeight.grid[1][2];
		var resultWithWeight = astar.search(graphWithWeight, startWithWeight, endWithWeight);

		// resultWithWeight is an array containing the shortest path taking into account the weight of a node
	</script>

## Advanced Sample Usage

	<script type='text/javascript' src='astar.js'></script>
	<script type='text/javascript'>
                var graph = new Graph([
                    [1,3,0],  // array of weights
                    [1,1,0],
                    [0,1,1]
                ]);
                var stop_points = [{ x: 1, y: 0 }];
		var start = graph.grid[0][0];
		var end = graph.grid[2][2];
                var max_per_turn = 7;
		var result = astar.search(graph, start, end, max_per_turn, stop_points);
                // result is an array containing the shortest path
                // the path will take the route with weight 3 because the
                // entire path can be run in a single turn with 7 max_per_turn

	</script>

All basic and advanced features can be combined as needed.

A few notes about weight values:

1. A weight of 0 denotes a wall.
2. A weight cannot be negative.
3. A weight cannot be between 0 and 1 (exclusive).
4. A weight can contain decimal values (greater than 1).


## Running the test suite

[![Build
Status](https://api.travis-ci.org/danielmoniz/javascript-astar-advanced.png?branch=master)](https://github.com/danielmoniz/javascript-astar-advanced)

If you don't have grunt installed, follow the [grunt getting started guide](http://gruntjs.com/getting-started) first.

Pull down the project, then run:

		npm install
		grunt

Special thanks to Brian Grinstead (https://github.com/bgrins) and his
javascript-astar library (https://github.com/bgrins/javascript-astar).
