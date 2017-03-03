// javascript-astar 0.3.0
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a Binary Heap.
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html

(function(definition) {
    /* global module, define */
    if(typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = definition();
    } else if(typeof define === 'function' && define.amd) {
        define([], definition);
    } else {
        var exports = definition();
        window.astar = exports.astar;
        window.Graph = exports.Graph;
        window.Score = exports.Score;
    }
})(function() {

function pathTo(node){
    var curr = node,
        path = [];
    while(curr.parent) {
        path.push(curr);
        curr = curr.parent;
    }
    return path.reverse();
}

function getHeap() {
    return new BinaryHeap(function(node) {
        return node.f;
    });
}

var astar = {
    init: function(graph, barriers, stopPoints, partialStopPoints) {
        for (var i = 0, len = graph.nodes.length; i < len; ++i) {
            var node = graph.nodes[i];
            node.f = 0;
            node.g = 0;
            node.h = 0;
            node.visited = false;
            node.closed = false;
            node.parent = null;
        }

        if (!stopPoints) stopPoints = [];
        for (var i in stopPoints) {
          var point = stopPoints[i];
          var node = graph.grid[point.x][point.y];
          node.stopPoint = true;
        }

        if (!partialStopPoints) partialStopPoints = [];
        for (var i in partialStopPoints) {
          var partialStopPoint = partialStopPoints[i];
          var node = graph.grid[partialStopPoint.x][partialStopPoint.y];
          node.partialStopPoint = true;

          if (!node.allowedMoves) node.allowedMoves = [];
          if (partialStopPoint.allowedMoves) {
            node.allowedMoves = node.allowedMoves.concat(partialStopPoint.allowedMoves);
          }
        }

        if (!barriers) return;
        for (var i in barriers) {
            var barrier = barriers[i];
            var node = graph.grid[barrier.start.x][barrier.start.y];

            if (node.barriers === undefined) node.barriers = [];
            var adjacentNode = graph.grid[barrier.blocked.x][barrier.blocked.y];
            node.barriers.push(adjacentNode);
        }

    },

    /**
    * Perform an A* Search on a graph given a start node.
    * Finds all reachable locations from the start point given a maxPerTurn
    * value and a number of allowed turns.
    * Note: This function is currently limited to orthogonal (non-diagonal)
    * movement only.
    * @param {Graph} graph
    * @param {GridNode} start
    * @param {Array} maxPerTurn The maximum movement per turn allowed by the
    * entity.
    * @param {Array} stopPoints A list of points at which the entity must
    * stop for the turn.
    * @param {integer} turns The number of turns allowed. Defaults to 1.
    * Pathing will not return paths that require more than this number of
    * turns.
    * @param {Array} barriers A list of 'barriers' to which the algorithm must
    * adhere. A barrier is a wall between two adjacent points that prevents
    * pathing from one to the other. Barriers are uni-directional.
    * Ie. A->B might be disallowed, but B->A is valid unless specified.
    * Example barrier: { start: { x: 0, y: 0 }, blocked: { x: 0, y: 1 } }
    * This example prevents pathing from 'start' to 'blocked'.
    */
    findReachablePoints: function(graph, start, maxPerTurn, stopPoints, turns, barriers, partialStopPoints, options) {
        if (!maxPerTurn) return [];
        astar.init(graph, barriers, stopPoints, partialStopPoints);

        // @TODO Use options parameter

        if (!turns) turns = 1;

        var reachable = [];
        var openHeap = new BinaryHeap(function(node) {
            return node.g;
        });
        openHeap.push(start);

        // set a maxDistance for comparing path lengths
        var maxDistance = new Score(0, maxPerTurn);
        var extraWeightValue = maxPerTurn;
        if (maxPerTurn.length >= turns - 1) {
          extraWeightValue = maxPerTurn[turns - 1];
        } else if (maxPerTurn.length < turns - 1) {
          extraWeightValue = maxPerTurn[maxPerTurn.length - 1];
        }
        maxDistance.setValues(turns - 1, extraWeightValue, maxPerTurn);

        while(openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            if (currentNode != start) reachable.push(currentNode);

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // Ignore neighbor if a barrier is in place
                if (currentNode.barriers && currentNode.barriers.indexOf(neighbor) > -1) continue;

                if (currentNode.g == 0) {
                  if (currentNode == start) {
                    currentNode.g = new Score(0, maxPerTurn);
                  } else {
                    currentNode.g = new Score(0, maxPerTurn, currentNode.stopPoint);
                  }
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var currentGScore = currentNode.g;
                if (this.isNodePartialStopPointInThisDirection(currentNode, neighbor)) {
                    currentGScore = roundScoreUp(currentNode.g);
                }

                var gScore = currentGScore.addSingleSpace(neighbor.getCost(currentNode), neighbor.stopPoint),
                    beenVisited = neighbor.visited;

                if (gScore === false) continue;
                if (gScore > maxDistance) continue;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.g = gScore;

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'g' value.
                        openHeap.push(neighbor);
                    }
                    else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        return reachable;
    },

    /**
    * Perform an A* Search on a graph given a start and end node.
    * @param {Graph} graph
    * @param {GridNode} start
    * @param {GridNode} end
    * @param {Array} maxPerTurn The maximum movement per turn allowed by the
    * entity.
    * @param {Array} stopPoints A list of points at which the entity must
    * stop for the turn.
    * @param {Array} barriers A list of 'barriers' to which the algorithm must
    * adhere. A barrier is a wall between two adjacent points that prevents
    * pathing from one to the other. Barriers are uni-directional.
    * Ie. A->B might be disallowed, but B->A is valid unless specified.
    * Example barrier: { start: { x: 0, y: 0 }, blocked: { x: 0, y: 1 } }
    * This example prevents pathing from 'start' to 'blocked'.
    * @param {Object} [options]
    * @param {bool} [options.closest] Specifies whether to return the
               path to the closest node if the target is unreachable.
    * @param {Function} [options.heuristic] Heuristic function (see
    *          astar.heuristics).
    */
    search: function(graph, start, end, maxPerTurn, stopPoints, barriers, partialStopPoints, options) {
        astar.init(graph, barriers, stopPoints, partialStopPoints);

        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan,
            closest = options.closest || false;

        var openHeap = getHeap(),
            closestNode = start; // set the start node to be the closest if required

        start.h = getScoreFromDistance(heuristic(start, end), maxPerTurn);

        openHeap.push(start);

        while(openHeap.size() > 0) {

            // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();

            // End case -- result has been found, return the traced path.
            if(currentNode === end) {
                return pathTo(currentNode);
            }

            // Normal case -- move currentNode from open to closed, process each of its neighbors.
            currentNode.closed = true;

            // Find all neighbors for the current node.
            var neighbors = graph.neighbors(currentNode);

            for (var i = 0, il = neighbors.length; i < il; ++i) {
                var neighbor = neighbors[i];

                if (neighbor.closed || neighbor.isWall()) {
                    // Not a valid node to process, skip to next neighbor.
                    continue;
                }

                // Ignore neighbor if a barrier is in place
                if (currentNode.barriers && currentNode.barriers.indexOf(neighbor) > -1) continue;

                // @TODO Ensure nodes that are impossible to reach are removed
                // (or waited for if they can be reached later)

                if (currentNode.g == 0) {
                  if (currentNode == start) {
                    currentNode.g = new Score(0, 0, maxPerTurn);
                  } else {
                    //currentNode.g = new Score(0, 0, maxPerTurn, currentNode.stopPoint);
                    currentNode.g = new Score(0, 0, maxPerTurn, 0);
                  }
                } else if (currentNode.g === undefined) {
                  throw new Error('BadValue', 'currentNode.g cannot be undefined. Check that start node belongs to this graph.');
                }

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                var currentGScore = currentNode.g;
                if (this.isNodePartialStopPointInThisDirection(currentNode, neighbor)) {
                    currentGScore = roundScoreUp(currentNode.g);
                }

                var gScore = currentGScore.addSingleSpace(neighbor.getCost(currentNode), neighbor.stopPoint),
                    beenVisited = neighbor.visited;

                if (gScore === false) continue;

                if (!beenVisited || gScore.valueOf() < neighbor.g.valueOf()) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || getScoreFromDistance(heuristic(neighbor, end), maxPerTurn);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g.addScore(neighbor.h);
                    //neighbor.turns = gScore.turns;

                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h.valueOf() < closestNode.h.valueOf() ||
                          (neighbor.h.valueOf() == closestNode.h.valueOf() && neighbor.g.valueOf() < closestNode.g.valueOf())) {
                            closestNode = neighbor;
                        }
                    }

                    if (!beenVisited) {
                        // Pushing to heap will put it in proper place based on the 'f' value.
                        openHeap.push(neighbor);
                    }
                    else {
                        // Already seen the node, but since it has been rescored we need to reorder it in the heap
                        openHeap.rescoreElement(neighbor);
                    }
                }
            }
        }

        if (closest) {
            return pathTo(closestNode);
        }

        // No result was found - empty array signifies failure to find path.
        return [];
    },

    isNodePartialStopPointInThisDirection: function(currentNode, neighbor) {
        var stopPoint = false;
        if (currentNode.partialStopPoint) {
            if (!currentNode.allowedMoves) return true;
            stopPoint = true;
            for (var i in currentNode.allowedMoves) {
                var move = currentNode.allowedMoves[i];
                if (move.x == neighbor.x && move.y == neighbor.y) {
                    return false;
                }
            }
        }

        return stopPoint;
    },

    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
    heuristics: {
        manhattan: function(pos0, pos1) {
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return d1 + d2;
        },
        diagonal: function(pos0, pos1) {
            var D = 1;
            var D2 = Math.sqrt(2);
            var d1 = Math.abs(pos1.x - pos0.x);
            var d2 = Math.abs(pos1.y - pos0.y);
            return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
        }
    },

};

/*
 * An object that stores information about the number of required turns for a
 * given move, as well as the number of extra spaces that would be traversed
 * before getting there.
 * Score objects use a large number to calculate their values. A higher turn
 * value always means a higher score, meaning that the path is less optimal.
 * Extra spaces required (extraWeight) are treated as tiebreakers.
 *
 * Eg. the score (1, 3) represents 1 turn and 3 extra spaces to move there.
 * (1, 3) < (2, 1) < (2, 4)
 *
 * Specifically, (3, 5) evaluates to 3 * largeNumber + 5
 * If the large number is 1 million, then (3, 5) evaluates to 3000005 when
 * using valueOf() or comparison operators.
 * NOTE: Equality still represents object equality, not Score value equality.
 * So (1, 3) != (1, 3), even though they evaluate to the same number.
 * Always use valueOf() when comparing scores to values for equality.
 *
 * A maxPerTurn of 0 implies that there is no maxPerTurn, ie. treat the
 * pathing task as normal (without turns or stopPoints).
 *
 * maxPerTurn can be an array, eg. [3, 5], which represents movement limits
 * on different turns. The last value is used for any turns for which no
 * maxPerTurn value was provided. Eg. one could move 3, then 5, then 5, 5,...
 *
 * See README for more information.
 */
function Score(turns, extraWeight, maxPerTurn, totalDistance) {
  console.log('---');
  console.log(turns);
  console.log(turns != 0 % 1);
  console.log(extraWeight);
  console.log(maxPerTurn);
  console.log(totalDistance);
  if (turns && (typeof turns != 'number' || turns % 1 != 0 || turns < 0)) {
    throw new Error('BadParam', 'turns must be a nonnegative integer.');
  }
  if (extraWeight && (typeof extraWeight != 'number' || extraWeight < 0 || (extraWeight > 0 && extraWeight < 1))) {
    throw new Error('BadParam', 'extraWeight must be a nonnegative number.');
  }
  if (maxPerTurn &&
      ((typeof maxPerTurn != 'number' || (maxPerTurn < 0 || maxPerTurn % 1 != 0)) &&
      (typeof maxPerTurn != 'object' || !maxPerTurn.length))) {
    throw new Error('BadParam', 'maxPerTurn must be a non-negative number or a non-empty list.');
  }
  if (totalDistance && (typeof totalDistance != 'number' || totalDistance < 0)) {
    throw new Error('BadParam', 'totalDistance must be a nonnegative number.');
  }

  this.turns = turns || 0;
  this.extraWeight = extraWeight || 0;
  this.maxPerTurn = maxPerTurn || 0;
  this.totalDistance = totalDistance || 0;
}

Score.prototype.copy = function() {
  return new Score(this.turns, this.extraWeight, this.maxPerTurn, this.totalDistance);
}

function getScoreFromDistance(distance, maxPerTurn, stopPoint) {
  if (typeof distance != 'number' || distance === undefined) {
    throw new Error('BadParam', 'distance parameter must be a number.');
  }
  if (maxPerTurn && typeof maxPerTurn != 'number' && typeof maxPerTurn != 'object') {
    throw new Error('BadParam', 'maxPerTurn must be a number or list.');
  }

  if (maxPerTurn === undefined) maxPerTurn = [0];
  if (typeof maxPerTurn == 'number') maxPerTurn = [maxPerTurn];

  var firstTurnMax = maxPerTurn[0];
  var futureTurnsMax = maxPerTurn[0];
  if (maxPerTurn.length > 1) {
    futureTurnsMax = maxPerTurn.slice(1);
  }

  var turns = 0;
  var extraWeight = distance;
  while(extraWeight > firstTurnMax) {
    // can spend entire first turn on the extra weight available
    extraWeight -= firstTurnMax;
    turns += 1;

    maxPerTurn = futureTurnsMax;
    firstTurnMax = maxPerTurn[0];
    if (maxPerTurn.length > 1) {
      futureTurnsMax = maxPerTurn.slice(1);
    }
  }

  if (stopPoint) extraWeight = firstTurnMax;
  return new Score(turns, extraWeight, maxPerTurn, distance);
}

/*
 * Returns a new score object that has had a value added correctly,
 * as if 'addition' is the weight for a single space.
 * Will return false if movement to that space is impossible within the
 * current turn or the next one.
 */
Score.prototype.addSingleSpace = function(addition, stopPoint) {
  if (typeof addition != 'number') throw new Error('BadParam', 'Must specify amount to add.');

  var maxPerTurn = this.maxPerTurn,
      turns = this.turns,
      extraWeight = this.extraWeight,
      distance = this.distance + addition;

  if (addition + extraWeight > maxPerTurn[0]) {
    if (maxPerTurn.length > 1) maxPerTurn = maxPerTurn.slice(1);

    // @TODO Test this case! Specifically, test when a tile has weight too
    // large for both the current maxPerTurn value and the next one.
    if (addition > maxPerTurn[0]) {
      //if (maxPerTurn.length == 1) return false;
      return false;
    }
    turns += 1;
    extraWeight = addition;
  } else {
    extraWeight += addition;
  }

  if (stopPoint) extraWeight = maxPerTurn[0];

  return new Score(turns, extraWeight, maxPerTurn, distance);
};

/*
 * Returns a new score object that has had a value added correctly,
 * as if 'addition' is a total weight and not the weight for a single space.
 * Eg. 'addition' could represent the total weight of a path.
 * 'addition' must be a positive number.
 */
Score.prototype.addDistance = function(addition) {
  if (!addition) throw new Error('BadParam', 'Must specify amount to add.');
  if (addition < 0) throw new Error('BadParam', 'Must provide a positive value.');

  var maxPerTurn = this.maxPerTurn,
      turns = this.turns,
      extraWeight = this.extraWeight,
      distance = this.distance + addition;

  var remainingWeight = extraWeight + addition;
  while(remainingWeight + extraWeight > maxPerTurn[0]) {
    var delta = maxPerTurn[0] - extraWeight;
    distance += delta;
    remainingWeight -= delta;
    turns += 1;
    extraWeight = 0;
    if (maxPerTurn.length > 1) maxPerTurn = maxPerTurn.slice(1);
  }

  extraWeight += remainingWeight;
  distance += remainingWeight;

  return new Score(turns, extraWeight, maxPerTurn, distance);
};

/*
 * Returns a new score object that is the added result of two scores.
 */
Score.prototype.addScore = function(score) {
  var newScore = new Score(
    this.turns + score.turns,
    this.extraWeight + score.extraWeight,
    this.distance + score.distance);
  return newScore;
};

Score.prototype.valueOf = function() {
  var hugeNum = 1000000;
  return hugeNum * this.turns + this.extraWeight;
};

Score.prototype.roundUp = function() {
  var maxPerTurn = this.maxPerTurn;

  var firstTurnMax = maxPerTurn[0];
  var futureTurnsMax = maxPerTurn[0];
  if (maxPerTurn.length > 1) {
    var futureTurnsMax = maxPerTurn.slice(1);
  }

  newScore.setValues(this.turns + 1, firstTurnMax, futureTurnsMax);

  //var newScore = new Score(this.turns + 1, );
  return newScore;
};

/**
* A graph memory structure
* @param {Array} gridIn 2D array of input weights
* @param {Object} [options]
* @param {bool} [options.diagonal] Specifies whether diagonal moves are allowed
*/
function Graph(gridIn, options) {
    options = options || {};
    this.nodes = [];
    this.diagonal = !!options.diagonal;
    this.grid = [];
    for (var x = 0; x < gridIn.length; x++) {
        this.grid[x] = [];

        for (var y = 0, row = gridIn[x]; y < row.length; y++) {
            if (typeof row[y] == 'number') {
              var node = new GridNode(x, y, row[y]);
            } else if (typeof row[y] == 'object') {
              var node = new GridNode(x, y, row[y]);
            }
            this.grid[x][y] = node;
            this.nodes.push(node);
        }
    }
}

Graph.prototype.neighbors = function(node) {
    var ret = [],
        x = node.x,
        y = node.y,
        grid = this.grid;

    // West
    if(grid[x-1] && grid[x-1][y]) {
        ret.push(grid[x-1][y]);
    }

    // East
    if(grid[x+1] && grid[x+1][y]) {
        ret.push(grid[x+1][y]);
    }

    // South
    if(grid[x] && grid[x][y-1]) {
        ret.push(grid[x][y-1]);
    }

    // North
    if(grid[x] && grid[x][y+1]) {
        ret.push(grid[x][y+1]);
    }

    if (this.diagonal) {
        // Southwest
        if(grid[x-1] && grid[x-1][y-1]) {
            ret.push(grid[x-1][y-1]);
        }

        // Southeast
        if(grid[x+1] && grid[x+1][y-1]) {
            ret.push(grid[x+1][y-1]);
        }

        // Northwest
        if(grid[x-1] && grid[x-1][y+1]) {
            ret.push(grid[x-1][y+1]);
        }

        // Northeast
        if(grid[x+1] && grid[x+1][y+1]) {
            ret.push(grid[x+1][y+1]);
        }
    }

    return ret;
};

Graph.prototype.toString = function() {
    var graphString = [],
        nodes = this.grid, // when using grid
        rowDebug, row, y, l;
    for (var x = 0, len = nodes.length; x < len; x++) {
        rowDebug = [];
        row = nodes[x];
        for (y = 0, l = row.length; y < l; y++) {
            rowDebug.push(row[y].weight);
        }
        graphString.push(rowDebug.join(" "));
    }
    return graphString.join("\n");
};

function GridNode(x, y, weight, stopPoint) {
    this.x = x;
    this.y = y;
    this.weight = weight;
    this.stopPoint = stopPoint ? true : false;
}

GridNode.prototype.toString = function() {
    return "[" + this.x + " " + this.y + "]";
};

GridNode.prototype.getCost = function() {
    return this.weight;
};

GridNode.prototype.isWall = function() {
    return this.weight === 0;
};

GridNode.prototype.isStopPoint = function() {
    return this.stopPoint;
};

function BinaryHeap(scoreFunction){
    this.content = [];
    this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
    push: function(element) {
        // Add the new element to the end of the array.
        this.content.push(element);

        // Allow it to sink down.
        this.sinkDown(this.content.length - 1);
    },
    pop: function() {
        // Store the first element so we can return it later.
        var result = this.content[0];
        // Get the element at the end of the array.
        var end = this.content.pop();
        // If there are any elements left, put the end element at the
        // start, and let it bubble up.
        if (this.content.length > 0) {
            this.content[0] = end;
            this.bubbleUp(0);
        }
        return result;
    },
    remove: function(node) {
        var i = this.content.indexOf(node);

        // When it is found, the process seen in 'pop' is repeated
        // to fill up the hole.
        var end = this.content.pop();

        if (i !== this.content.length - 1) {
            this.content[i] = end;

            if (this.scoreFunction(end) < this.scoreFunction(node)) {
                this.sinkDown(i);
            }
            else {
                this.bubbleUp(i);
            }
        }
    },
    size: function() {
        return this.content.length;
    },
    rescoreElement: function(node) {
        this.sinkDown(this.content.indexOf(node));
    },
    sinkDown: function(n) {
        // Fetch the element that has to be sunk.
        var element = this.content[n];

        // When at 0, an element can not sink any further.
        while (n > 0) {

            // Compute the parent element's index, and fetch it.
            var parentN = ((n + 1) >> 1) - 1,
                parent = this.content[parentN];
            // Swap the elements if the parent is greater.
            if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                this.content[parentN] = element;
                this.content[n] = parent;
                // Update 'n' to continue at the new position.
                n = parentN;
            }
            // Found a parent that is less, no need to sink any further.
            else {
                break;
            }
        }
    },
    bubbleUp: function(n) {
        // Look up the target element and its score.
        var length = this.content.length,
            element = this.content[n],
            elemScore = this.scoreFunction(element);

        while(true) {
            // Compute the indices of the child elements.
            var child2N = (n + 1) << 1,
                child1N = child2N - 1;
            // This is used to store the new position of the element, if any.
            var swap = null,
                child1Score;
            // If the first child exists (is inside the array)...
            if (child1N < length) {
                // Look it up and compute its score.
                var child1 = this.content[child1N];
                child1Score = this.scoreFunction(child1);

                // If the score is less than our element's, we need to swap.
                if (child1Score < elemScore){
                    swap = child1N;
                }
            }

            // Do the same checks for the other child.
            if (child2N < length) {
                var child2 = this.content[child2N],
                    child2Score = this.scoreFunction(child2);
                if (child2Score < (swap === null ? elemScore : child1Score)) {
                    swap = child2N;
                }
            }

            // If the element needs to be moved, swap it, and continue.
            if (swap !== null) {
                this.content[n] = this.content[swap];
                this.content[swap] = element;
                n = swap;
            }
            // Otherwise, we are done.
            else {
                break;
            }
        }
    }
};

return {
    astar: astar,
    Graph: Graph,
    Score: Score,
};

});
