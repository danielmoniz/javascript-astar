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
    init: function(graph) {
        for (var i = 0, len = graph.nodes.length; i < len; ++i) {
            var node = graph.nodes[i];
            node.f = 0;
            node.g = 0;
            node.h = 0;
            node.visited = false;
            node.closed = false;
            node.parent = null;
        }
    },

    /**
    * Perform an A* Search on a graph given a start node.
    * Finds all reachable locations from the start point given a max_per_turn
    * value and a number of allowed turns.
    * Note: This function is currently limited to orthogonal (non-diagonal)
    * movement only.
    * @param {Graph} graph
    * @param {GridNode} start
    * @param {Array} max_per_turn The maximum movement per turn allowed by the
    * entity.
    * @param {Array} stop_points A list of points at which the entity must
    * stop for the turn.
    */
    findReachablePoints: function(graph, start, max_per_turn, stop_points, turns) {
        if (!max_per_turn) return [];
        astar.init(graph);

        if (!stop_points) stop_points = [];
        if (!turns) turns = 1;
        for (var i in stop_points) {
          var point = stop_points[i];
          var node = graph.grid[point.x][point.y];
          node.stop_point = true;
        }

        var reachable = [];
        var openHeap = new BinaryHeap(function(node) {
            return node.g;
        });
        openHeap.push(start);

        // set a max_distance for comparing path lengths
        var max_distance = new Score(0, max_per_turn);
        var extra_weight_value = max_per_turn;
        if (max_per_turn.length >= turns - 1) {
          extra_weight_value = max_per_turn[turns - 1];
        } else if (max_per_turn.length < turns - 1) {
          extra_weight_value = max_per_turn[max_per_turn.length - 1];
        }
        max_distance.setValues(turns - 1, extra_weight_value, max_per_turn);

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

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
                if (currentNode.g == 0) {
                  if (currentNode == start) {
                    currentNode.g = new Score(0, max_per_turn);
                  } else {
                    currentNode.g = new Score(0, max_per_turn, currentNode.stop_point);
                  }
                }
                var gScore = currentNode.g.addSingleSpace(neighbor.getCost(currentNode), neighbor.stop_point),
                    beenVisited = neighbor.visited;

                if (gScore === false) continue;
                if (gScore > max_distance) continue;

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
    * @param {Array} max_per_turn The maximum movement per turn allowed by the
    * entity.
    * @param {Array} stop_points A list of points at which the entity must
    * stop for the turn.
    * @param {Object} [options]
    * @param {bool} [options.closest] Specifies whether to return the
               path to the closest node if the target is unreachable.
    * @param {Function} [options.heuristic] Heuristic function (see
    *          astar.heuristics).
    */
    search: function(graph, start, end, max_per_turn, stop_points, options) {
        astar.init(graph);

        if (!stop_points) stop_points = [];
        for (var i in stop_points) {
          var point = stop_points[i];
          var node = graph.grid[point.x][point.y];
          node.stop_point = true;
        }

        options = options || {};
        var heuristic = options.heuristic || astar.heuristics.manhattan,
            closest = options.closest || false;

        var openHeap = getHeap(),
            closestNode = start; // set the start node to be the closest if required

        start.h = new Score(heuristic(start, end), max_per_turn);

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

                // @TODO Ensure nodes that are impossible to reach are removed
                // (or waited for if they can be reached later)

                // The g score is the shortest distance from start to current node.
                // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.

                if (currentNode.g == 0) {
                  if (currentNode == start) {
                    currentNode.g = new Score(0, max_per_turn);
                  } else {
                    currentNode.g = new Score(0, max_per_turn, currentNode.stop_point);
                  }
                } else if (currentNode.g === undefined) {
                  throw new Error('BadValue', 'currentNode.g cannot be undefined. Check that start node belongs to this graph.');
                }

                var gScore = currentNode.g.addSingleSpace(neighbor.getCost(currentNode), neighbor.stop_point),
                    beenVisited = neighbor.visited;

                if (gScore === false) continue;

                if (!beenVisited || gScore < neighbor.g) {

                    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
                    neighbor.visited = true;
                    neighbor.parent = currentNode;
                    neighbor.h = neighbor.h || new Score(heuristic(neighbor, end), max_per_turn);
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
    }
};

/*
 * An object that stores information about the number of required turns for a
 * given move, as well as the number of extra spaces that would be traversed
 * before getting there.
 * Score objects use a large number to calculate their values. A higher turn
 * value always means a higher score, meaning that the path is less optimal.
 * Extra spaces required (extra_weight) are treated as tiebreakers.
 *
 * Eg. the score (1, 3) represents 1 turn and 3 extra spaces to move there.
 * (1, 3) < (2, 1) < (2, 4)
 *
 * Specifically, (3, 5) evaluates to 3 * large_number + 5
 * If the large number is 1 million, then (3, 5) evaluates to 3000005 when
 * using valueOf() or comparison operators.
 * NOTE: Equality still represents object equality, not Score value equality.
 * So (1, 3) != (1, 3), even though they evaluate to the same number.
 * Always use valueOf() when comparing scores to values for equality.
 *
 * A max_per_turn of 0 implies that there is no max_per_turn, ie. treat the
 * pathing task as normal (without turns or stop_points).
 *
 * max_per_turn can be an array, eg. [3, 5], which represents movement limits
 * on different turns. The last value is used for any turns for which no
 * max_per_turn value was provided. Eg. one could move 3, then 5, then 5, 5,...
 *
 * See README for more information.
 */
function Score(score, max_per_turn, stop_point) {
  if ((typeof score != 'number' && typeof score != 'object') || score === undefined) {
    throw new Error('BadParam', 'score value must be a number or another score object.');
  }

  this.huge_num = 1000000;
  if (!max_per_turn) max_per_turn = this.huge_num;
  this.max_per_turn = max_per_turn;

  var turns = Math.floor(score / this.huge_num);
  var extra_weight = score % this.huge_num;

  if (typeof max_per_turn == 'object') {
    var first_turn_max = max_per_turn[0];
    var future_turns_max = max_per_turn[0];
    if (max_per_turn.length > 1) {
      var future_turns_max = max_per_turn.slice(1);
    }

    if (extra_weight > first_turn_max) {
      // can spend entire first turn on the extra weight available
      extra_weight -= first_turn_max;
      turns += 1;
      var value = this.valueOf(turns, extra_weight);
      var new_score = new Score(value, future_turns_max, stop_point);
      this.setValues(new_score.turns, new_score.extra_weight, future_turns_max);
      return;

    } else {
      if (stop_point && extra_weight < first_turn_max) extra_weight = first_turn_max;
      this.setValues(turns, extra_weight, max_per_turn);
      return;
    }

    // otherwise, build score object as normal
  } else if (typeof max_per_turn == 'number') {
    var added_turns = Math.max(Math.ceil(extra_weight / max_per_turn), 1) - 1;
    turns += added_turns;
    extra_weight = extra_weight - added_turns * max_per_turn;
    if (stop_point && extra_weight < max_per_turn) extra_weight = max_per_turn;
    this.setValues(turns, extra_weight, this.max_per_turn);
  } else {
    throw new Error('BadParam', 'max_per_turn must be an array or a number.');
  }

}

/*
 * Returns a new score object that has had a value added correctly,
 * as if 'addition' is the weight for a single space.
 * Will return false if movement to that space is impossible.
 */
Score.prototype.addSingleSpace = function(addition, stop_point) {
  if (typeof addition != 'number') throw new Error('BadParam', 'Must specify amount to add.');

  var max_per_turn_value = this.max_per_turn;
  if (max_per_turn_value.length) max_per_turn_value = this.max_per_turn[0];

  if (typeof this.max_per_turn == 'number' || (this.max_per_turn.length && this.max_per_turn.length <= 1)) {
    // do or die  - if addition is too high, move is impossible
    if (addition > max_per_turn_value) {
      return false;
    }
  }

  if (addition + this.extra_weight > max_per_turn_value) {
    var max_per_turn = this.max_per_turn;
    if (max_per_turn.length && max_per_turn.length > 1) {
      max_per_turn = max_per_turn.slice(1);
    } else if (max_per_turn.length && max_per_turn.length <= 1) {
      max_per_turn = max_per_turn[0];
    }
    var new_value = this.valueOf(this.turns + 1, 0);
    var new_score = new Score(new_value, max_per_turn);
    return new_score.addSingleSpace(addition, stop_point);

  }

  var extra_weight = this.extra_weight + addition;
  var new_value = this.valueOf(this.turns, extra_weight);
  var new_score = new Score(new_value, this.max_per_turn, stop_point);
  return new_score;

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

  var new_score = new Score(addition, this.max_per_turn);
  var total_extra_weight = this.extra_weight + new_score.extra_weight;
  this.max_per_turn = new_score.max_per_turn;
  var max_per_turn_value = this.max_per_turn;
  if (max_per_turn_value.length) max_per_turn_value = this.max_per_turn[0];

  if (total_extra_weight > max_per_turn_value) {
    var remaining_weight = total_extra_weight - max_per_turn_value;
    var max_per_turn = this.max_per_turn;
    if (max_per_turn.length && max_per_turn.length > 1) max_per_turn = max_per_turn.slice(1);

    var turns = this.turns + new_score.turns + 1;
    var value = this.valueOf(turns, remaining_weight);
    var result_score = new Score(value, max_per_turn);
    return result_score;

  } else {
    // simply return the two after adding their properties
    var sum = this.valueOf() + new_score.valueOf();
    return new Score(sum, this.max_per_turn);
  }

};

Score.prototype.setValues = function(turns, extra_weight, max_per_turn) {
  this.turns = turns;
  this.extra_weight = extra_weight;
  this.max_per_turn = max_per_turn;
};

Score.prototype.valueOf = function(turns, extra_weight) {
  if (turns === undefined || extra_weight === undefined) {
    return this.huge_num * this.turns + this.extra_weight;
  }
  return this.huge_num * turns + extra_weight;
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

function GridNode(x, y, weight, stop_point) {
    this.x = x;
    this.y = y;
    this.weight = weight;
    this.stop_point = stop_point ? true : false;
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
    return this.stop_point;
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
