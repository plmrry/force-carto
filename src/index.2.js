// @ts-check
import React, { createElement as h, Component, Fragment } from "react";
import ReactDOM from "react-dom";
import Measure from "react-measure";
import update from "immutability-helper";
import * as d3 from "d3";

/** COLLISION */

const quadtree = d3.quadtree;

function x(d) {
  return d.x + d.vx;
}

function y(d) {
  return d.y + d.vy;
}

function constant(x) {
  return function() {
    return x;
  };
}

function jiggle() {
  return (Math.random() - 0.5) * 1e-6;
}

function d3_forceCollide(radius) {
  var nodes,
    radii,
    strength = 1,
    iterations = 1;

  if (typeof radius !== "function")
    radius = constant(radius == null ? 1 : +radius);

  function force() {
    var i,
      n = nodes.length,
      tree,
      node,
      nodeXnext,
      nodeYnext,
      currentRadius,
      ri2;

    for (var k = 0; k < iterations; ++k) {
      // console.log("new quadtree");
      tree = quadtree(nodes, x, y).visitAfter(prepare);
      for (i = 0; i < n; ++i) {
        node = nodes[i];
        currentRadius = radii[node.index];
        ri2 = currentRadius * currentRadius;
        nodeXnext = node.x + node.vx;
        nodeYnext = node.y + node.vy;
        tree.visit(apply);
      }
    }

    function apply(quad, x0, y0, x1, y1) {
      let quadNode = quad.data;
      let rj = quad.r;
      let r = currentRadius + rj;
      if (quadNode) {
        if (quadNode.index > node.index) {
          var x = nodeXnext - quadNode.x - quadNode.vx,
            y = nodeYnext - quadNode.y - quadNode.vy,
            l = x * x + y * y;
          if (l < r * r) {
            if (x === 0) (x = jiggle()), (l += x * x);
            if (y === 0) (y = jiggle()), (l += y * y);
            l = Math.sqrt(l);
            l = (r - l) / l * strength;
            rj *= rj;
            r = rj / (ri2 + rj);
            x *= l;
            node.vx += x * r;
            y *= l;
            node.vy += y * r;
            r = 1 - r;
            quadNode.vx -= x * r;
            quadNode.vy -= y * r;
          }
        }
        return;
      }
      return (
        x0 > nodeXnext + r ||
        x1 < nodeXnext - r ||
        y0 > nodeYnext + r ||
        y1 < nodeYnext - r
      );
    }
  }

  function prepare(quad) {
    if (quad.data) {
      const radius = radii[quad.data.index];
      const width = 2 * radius;
      const height = 2 * radius;
      quad.r = radius;
      quad.width = width;
      quad.height = height;
      return;
    }
    /** Save the maximum child quadrant radius */
    quad.r = d3.max(quad, (d = {}) => d.r) || 0;
    quad.width = d3.max(quad, (d = {}) => d.width) || 0;
    quad.height = d3.max(quad, (d = {}) => d.height) || 0;
  }

  function initialize() {
    if (!nodes) return;
    var i,
      n = nodes.length,
      node;
    radii = new Array(n);
    nodes.forEach(node => {
      radii[node.index] = +radius(node, i, nodes);
    });
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.iterations = function(_) {
    return arguments.length ? ((iterations = +_), force) : iterations;
  };

  force.strength = function(_) {
    return arguments.length ? ((strength = +_), force) : strength;
  };

  force.radius = function(_) {
    return arguments.length
      ? ((radius = typeof _ === "function" ? _ : constant(+_)),
        initialize(),
        force)
      : radius;
  };

  return force;
}

function d3_inefficient_forceCollide(radius) {
  var nodes,
    strength = 1,
    iterations = 1;

  if (typeof radius !== "function")
    radius = constant(radius == null ? 1 : +radius);

  function force() {
    d3.range(iterations).forEach(() => {
      nodes.forEach(node => {
        const currentRadius = node.radius;
        const ri2 = currentRadius * currentRadius;
        const nodeXnext = node.x + node.vx;
        const nodeYnext = node.y + node.vy;
        nodes
          .filter(otherNode => otherNode.index > node.index)
          .forEach(quadNode => {
            let quadNodeRadius = quadNode.radius;
            let r = currentRadius + quadNodeRadius;
            const quadNodeXnext = quadNode.x + quadNode.vx;
            const quadNodeYnext = quadNode.y + quadNode.vy;
            let x = nodeXnext - quadNodeXnext;
            let y = nodeYnext - quadNodeYnext;
            let l = x * x + y * y;
            if (l < r * r) {
              if (x === 0) (x = jiggle()), (l += x * x);
              if (y === 0) (y = jiggle()), (l += y * y);
              l = Math.sqrt(l);
              l = (r - l) / l * strength;
              const quadNodeRadius2 = quadNodeRadius * quadNodeRadius;
              r = quadNodeRadius2 / (ri2 + quadNodeRadius2);
              x *= l;
              node.vx += x * r;
              y *= l;
              node.vy += y * r;
              r = 1 - r;
              quadNode.vx -= x * r;
              quadNode.vy -= y * r;
            }
          });
      });
    });
  }

  function initialize() {
    console.log("inefficient sdfsdf forcecollide");
    if (!nodes) return;
  }

  force.initialize = function(_) {
    nodes = _;
    initialize();
  };

  force.iterations = function(_) {
    return arguments.length ? ((iterations = +_), force) : iterations;
  };

  force.strength = function(_) {
    return arguments.length ? ((strength = +_), force) : strength;
  };

  force.radius = function(_) {
    return arguments.length
      ? ((radius = typeof _ === "function" ? _ : constant(+_)),
        initialize(),
        force)
      : radius;
  };

  return force;
}

let STATE = {};

const SIZE = "SIZE";
const SET_STATE = "SET_STATE";
const TICK = "TICK";
const NODES = "NODES";
const START = "START";
const RESTART = "RESTART";

function createForceMiddleware({ dispatch, setState, getState }) {
  const numNodes = 50;
  const scale = d3.scaleLinear().range([5, 15]);
  const nodes = d3
    .range(numNodes)
    .map(p => ({
      radius: scale(Math.random()),
      width: scale(Math.random()),
      height: scale(Math.random())
    }));
  const collideStrength = 0.6;
  const forceCollide = d3_inefficient_forceCollide(d => d.radius).strength(
    collideStrength
  );
  const force = d3
    .forceSimulation(nodes)
    .alphaTarget(0.01)
    .force("collide", forceCollide)
    .on("tick", () => dispatch({ type: NODES, payload: nodes }))
    .stop();
  console.log("initial nodes", nodes);
  return action => {
    const { type, payload } = action;
    if (type === START) {
      dispatch({ type: NODES, payload: nodes });
    }
    if (type === TICK) {
      force.tick();
      dispatch({ type: NODES, payload: nodes });
    }
    if (type === SIZE) {
      const { width, height } = payload;
      // forceCenter.x(width / 2).y(height / 2);
    }
    if (type === RESTART) {
      force.alpha(1).restart();
    }
  };
}

const forceMiddleware = createForceMiddleware({
  dispatch: action => dispatch(action),
  setState,
  getState: () => STATE
});

function dispatch(action) {
  forceMiddleware(action);
  const { type, payload } = action;
  if (type === NODES) {
    const nodes = payload;
    setState(state =>
      update(state, {
        nodes: {
          $set: nodes
        }
      })
    );
  }
  if (type === START) {
    setState();
  }
  if (type === SIZE) {
    setState(state =>
      update(state, {
        $merge: payload
      })
    );
  }
  if (type === SET_STATE) {
    setState(payload);
  }
}

function Svg(props) {
  const { nodes = [], width = 100, height = 100 } = props;
  const circles = nodes.map((d, i) => {
    const { x, y, index, radius } = d;
    return (
      <g key={index} transform={`translate(${x}, ${y})`}>
        <circle r={radius} style={{ fillOpacity: 0.5 }} />
        <rect
          x={-radius}
          y={-radius}
          width={2 * radius}
          height={2 * radius}
          style={{ fill: "none", stroke: "#555" }}
        />
      </g>
    );
  });
  return (
    <svg
      style={{
        display: "block",
        height: "100%",
        width: "100%",
        pointerEvents: "none"
      }}
      transform="scale(2)"
    >
      <g transform={`translate(${width / 2}, ${height / 2})`}>{circles}</g>
    </svg>
  );
}

function App(props) {
  const { dispatch = () => {}, height, width } = props;

  const divHeight = height ? `${height}px` : "50vh";
  const divWidth = width ? `${width}px` : "100%";

  return (
    <Fragment>
      <button onClick={() => dispatch({ type: TICK })}>tick</button>
      <button onClick={() => dispatch({ type: RESTART })}>restart</button>
      <Measure
        bounds
        onResize={size => {
          const { entry: { height, width } } = size;
          dispatch({
            type: SIZE,
            payload: {
              height,
              width
            }
          });
        }}
      >
        {({ measureRef }) => (
          <div
            ref={measureRef}
            style={{
              width: divWidth,
              height: divHeight,
              border: "1px solid black"
            }}
          >
            <Svg {...props} />
          </div>
        )}
      </Measure>
    </Fragment>
  );
}

function setState(fn = s => s) {
  STATE = fn(STATE);
  ReactDOM.render(
    h(App, { ...STATE, dispatch }),
    document.getElementById("root")
  );
}

dispatch({ type: START });
