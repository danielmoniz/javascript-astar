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
    init: function(graph, barriers) {
        for (var i = 0, len = graph.nodes.length; i < len; ++i) {
            var node = graph.nodes[i];
            node.f = 0;
            node.g = 0;
            node.h = 0;
            node.visited = false;
            node.closed = false;
            node.parent = null;
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
    findReachablePoints: function(graph, start, maxPerTurn, stopPoints, turns, barriers) {

        if (!maxPerTurn) return [];
        astar.init(graph, barriers);

        if (!stopPoints) stopPoints = [];
        if (!turns) turns = 1;
        for (var i in stopPoints) {
          var point = stopPoints[i];
          var node = graph.grid[point.x][point.y];
          node.stopPoint = true;
        }

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
                try {
                  if (currentNode.barriers.indexOf(neighbor) > -1) continue;
                } catch (error) {}

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                if (currentNode.g == 0) {
                  if (currentNode == start) {
                    currentNode.g = new Score(0, maxPerTurn);
                  } else {
                    currentNode.g = new Score(0, maxPerTurn, currentNode.stopPoint);
                  }
                }
                var gScore = currentNode.g.addSingleSpace(neighbor.getCost(currentNode), neighbor.stopPoint),
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
    search: function(graph, start, end, maxPerTurn, stopPoints, barriers, options) {
        astar.init(graph, barriers);

        if (!stopPoints) stopPoints = [];
        for (var i in stopPoints) {
          var point = stopPoints[i];
          var node = graph.grid[point.x][point.y];
          node.stopPoint = true;
        }

        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan,
            closest = options.closest || false;

        var openHeap = getHeap(),
            closestNode = start; // set the start node to be the closest if required

        start.h = new Score(heuristic(start, end), maxPerTurn);

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
                try {
                  if (currentNode.barriers.indexOf(neighbor) > -1) continue;
                } catch (error) {}

                // @TODO Ensure nodes that are impossible to reach are removed
                // (or waited for if they can be reached later)

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.

                if (currentNode.g == 0) {
                  if (currentNode == start) {
                    currentNode.g = new Score(0, maxPerTurn);
                  } else {
                    currentNode.g = new Score(0, maxPerTurn, currentNode.stopPoint);
                  }
                } else if (currentNode.g === undefined) {
                  throw new Error('BadValue', 'currentNode.g cannot be undefined. Check that start node belongs to this graph.');
                }

                var gScore = currentNode.g.addSingleSpace(neighbor.getCost(currentNode), neighbor.stopPoint),
                    beenVisited = neighbor.visited;

                if (gScore === false) continue;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || new Score(heuristic(neighbor, end), maxPerTurn);
                    neighbor.g = gScore;
                    neighbor.f = neighbor.g.add(neighbor.h);
                    //neighbor.turns = gScore.turns;

                    if (closest) {
                        // If the neighbour is closer than the current closestNode or if it's equally close but has
                        // a cheaper path than the current closest node then it becomes the closest node
                        if (neighbor.h < closestNode.h || (neighbor.h == closestNode.h && neighbor.g < closestNode.g)) {
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
function Score(score, maxPerTurn, stopPoint) {
  if ((typeof score != 'number' && typeof score != 'object') || score === undefined) {
    throw new Error('BadParam', 'score value must be a number or another score object.');
  }

  this.hugeNum = 1000000;
  if (!maxPerTurn) maxPerTurn = this.hugeNum;
  this.maxPerTurn = maxPerTurn;

  var turns = Math.floor(score / this.hugeNum);
  var extraWeight = score % this.hugeNum;

  if (typeof maxPerTurn == 'object') {
    var firstTurnMax = maxPerTurn[0];
    var futureTurnsMax = maxPerTurn[0];
    if (maxPerTurn.length > 1) {
      var futureTurnsMax = maxPerTurn.slice(1);
    }

    if (extraWeight > firstTurnMax) {
      // can spend entire first turn on the extra weight available
      extraWeight -= firstTurnMax;
      turns += 1;
      var value = this.valueOf(turns, extraWeight);
      var newScore = new Score(value, futureTurnsMax, stopPoint);
      this.setValues(newScore.turns, newScore.extraWeight, futureTurnsMax);
      return;

    } else {
      if (stopPoint && extraWeight < firstTurnMax) extraWeight = firstTurnMax;
      this.setValues(turns, extraWeight, maxPerTurn);
      return;
    }

    // otherwise, build score object as normal
  } else if (typeof maxPerTurn == 'number') {
    var addedTurns = Math.max(Math.ceil(extraWeight / maxPerTurn), 1) - 1;
    turns += addedTurns;
    extraWeight = extraWeight - addedTurns * maxPerTurn;
    if (stopPoint && extraWeight < maxPerTurn) extraWeight = maxPerTurn;
    this.setValues(turns, extraWeight, this.maxPerTurn);
  } else {
    throw new Error('BadParam', 'maxPerTurn must be an array or a number.');
  }

}

/*
 * Returns a new score object that has had a value added correctly,
 * as if 'addition' is the weight for a single space.
 * Will return false if movement to that space is impossible.
 */
Score.prototype.addSingleSpace = function(addition, stopPoint) {
  if (typeof addition != 'number') throw new Error('BadParam', 'Must specify amount to add.');

  var maxPerTurnValue = this.maxPerTurn;
  if (maxPerTurnValue.length) maxPerTurnValue = this.maxPerTurn[0];

  if (typeof this.maxPerTurn == 'number' || (this.maxPerTurn.length && this.maxPerTurn.length <= 1)) {
    // do or die  - if addition is too high, move is impossible
    if (addition > maxPerTurnValue) {
      return false;
    }
  }

  if (addition + this.extraWeight > maxPerTurnValue) {
    var maxPerTurn = this.maxPerTurn;
    if (maxPerTurn.length && maxPerTurn.length > 1) {
      maxPerTurn = maxPerTurn.slice(1);
    } else if (maxPerTurn.length && maxPerTurn.length <= 1) {
      maxPerTurn = maxPerTurn[0];
    }
    var newValue = this.valueOf(this.turns + 1, 0);
    var newScore = new Score(newValue, maxPerTurn);
    return newScore.addSingleSpace(addition, stopPoint);

  }

  var extraWeight = this.extraWeight + addition;
  var newValue = this.valueOf(this.turns, extraWeight);
  var newScore = new Score(newValue, this.maxPerTurn, stopPoint);
  return newScore;

};

/*
 * Returns a new score object that has had a value added correctly,
 * as if 'addition' is a total weight and not the weight for a single space.
 * Eg. 'addition' could represent the total weight of a path.
 * 'addition' must not be falsy (including 0).
 */
Score.prototype.add = function(addition) {
  if (!addition) throw new Error('BadParam', 'Must specify amount to add.');
  if (addition < 0) throw new Error('BadParam', 'Must provide a positive value.');

  var newScore = new Score(addition, this.maxPerTurn);
  var totalExtraWeight = this.extraWeight + newScore.extraWeight;
  this.maxPerTurn = newScore.maxPerTurn;
  var maxPerTurnValue = this.maxPerTurn;
  if (maxPerTurnValue.length) maxPerTurnValue = this.maxPerTurn[0];

  if (totalExtraWeight > maxPerTurnValue) {
    var remainingWeight = totalExtraWeight - maxPerTurnValue;
    var maxPerTurn = this.maxPerTurn;
    if (maxPerTurn.length && maxPerTurn.length > 1) maxPerTurn = maxPerTurn.slice(1);

    var turns = this.turns + newScore.turns + 1;
    var value = this.valueOf(turns, remainingWeight);
    var resultScore = new Score(value, maxPerTurn);
    return resultScore;

  } else {
    // simply return the two after adding their properties
    var sum = this.valueOf() + newScore.valueOf();
    return new Score(sum, this.maxPerTurn);
  }

};

Score.prototype.setValues = function(turns, extraWeight, maxPerTurn) {
  this.turns = turns;
  this.extraWeight = extraWeight;
  this.maxPerTurn = maxPerTurn;
};

Score.prototype.valueOf = function(turns, extraWeight) {
  if (turns === undefined || extraWeight === undefined) {
    return this.hugeNum * this.turns + this.extraWeight;
  }
  return this.hugeNum * turns + extraWeight;
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
