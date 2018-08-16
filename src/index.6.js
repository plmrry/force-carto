// @ts-check
/** JUST DRAW A THING FROM TURF.JS */
import React, { createElement as h, Component, Fragment } from "react";
import ReactDOM from "react-dom";
import Measure from "react-measure";
import update from "immutability-helper";
import * as d3 from "d3";
import * as turf from "turf";

let STATE = {};

const SIZE = "SIZE";
const SET_STATE = "SET_STATE";
const TICK = "TICK";
const NODES = "NODES";
const START = "START";
const RESTART = "RESTART";
const STOP = "STOP";
const POLYGON = "Polygon";

function getGeometry({ x, y, coordinates }) {
  const coords = [coordinates.map(arr => [arr[0] + x, arr[1] + y])];
  const geometry = turf.polygon(coords);
  return geometry;
}

function makeBlob({ radius = 20, points = 20, blobby = 20 } = {}) {
  const scale = d3.scaleLinear().domain([0, points - 1]);
  const coordinates = d3
    .range(points - 1)
    .map((_, i) => scale(i))
    .map(i => {
      const radians = i * 2 * Math.PI;
      const blobbyRadius = radius + Math.random() * blobby;
      let x = Math.cos(radians) * blobbyRadius;
      let y = Math.sin(radians) * blobbyRadius;
      if (Math.abs(x) < 1e-10) x = 0;
      if (Math.abs(y) < 1e-10) y = 0;
      return [x, y];
    });
  coordinates.push(coordinates[0]);
  return coordinates;
}

function collide() {
  let nodes = [];
  let strength = 0.05;
  function force() {
    nodes.forEach(node => {
      node.geometry = getGeometry(node);
    });
    nodes.forEach(node => {
      nodes.filter(other => other.index > node.index).forEach(other => {
        const intersect = turf.intersect(node.geometry, other.geometry);
        if (intersect) {
          const center = turf.centroid(intersect);
          const overlap = turf.bbox(intersect);
          const x = node.x - other.x;
          const y = node.y - other.y;
          const length = Math.sqrt(x * x + y * y);
          const x_overlap = overlap[2] - overlap[0];
          const y_overlap = overlap[3] - overlap[1];
          const lx = x_overlap / length;
          const ly = y_overlap / length;
          const move_x = x * lx * strength;
          const move_y = y * ly * strength;
          node.vx += move_x;
          node.vy += move_y;
          other.vx -= move_x;
          other.vy -= move_y;
        }
      });
    });
  }
  force.initialize = _ => {
    nodes = _;
  };
  return force;
}

function createForceMiddleware({ dispatch, setState, getState }) {
  const numNodes = 8;
  const scale = d3.scaleLinear().range([5, 15]);

  const nodes = d3
    .range(numNodes)
    .map(_ => ({}))
    .map(node => {
      const coordinates = makeBlob();
      return {
        ...node,
        coordinates
      };
    });

  const collideStrength = 0.6;

  const force = d3
    .forceSimulation(nodes)
    // .velocityDecay(0.01)
    // .force("x", d3.forceX(d => d.destX).strength(0.03))
    // .force("y", d3.forceY(d => d.destY).strength(0.03))
    // .force("physics", () => {
    //   nodes.forEach(node => {
    //     node.vx = node._vx;
    //     node.vy = node._vy;
    //   });
    // })
    .force("collide", collide())
    .alphaTarget(0.3)
    .on("tick", () => dispatch({ type: NODES, payload: nodes }))
    .stop();
  console.log("initial nodes", nodes);
  return action => {
    const { type, payload } = action;
    if (type === START) {
      dispatch({ type: NODES, payload: nodes });
    }
    if (type === STOP) {
      force.stop();
    }
    if (type === TICK) {
      force.tick();
      dispatch({ type: NODES, payload: nodes });
    }
    if (type === RESTART) {
      force.alpha(0.3).restart();
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
        $merge: payload,
        hasHeight: {
          $set: true
        }
      })
    );
  }
  if (type === SET_STATE) {
    setState(payload);
  }
}

const pathFunc = d3.geoPath();

const EXAMPLE_GEOM = {
  type: "Polygon",
  coordinates: [
    [
      [19.335937499999996, 46.558860303117164],
      [27.773437499999996, 40.713955826286046],
      [37.6171875, 39.095962936305476],
      [40.42968749999999, 47.27922900257082],
      [31.289062500000004, 50.736455137010665],
      [21.796875, 50.958426723359935],
      [19.335937499999996, 46.558860303117164]
    ]
  ]
};

const example = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [19.335937499999996, 46.558860303117164],
            [27.773437499999996, 40.713955826286046],
            [37.6171875, 39.095962936305476],
            [40.42968749999999, 47.27922900257082],
            [31.289062500000004, 50.736455137010665],
            [21.796875, 50.958426723359935],
            [19.335937499999996, 46.558860303117164]
          ]
        ]
      }
    }
  ]
};

// debugger

function Svg(props) {
  const { nodes = [], width = 100, height = 100, hasHeight } = props;
  const circles = nodes.map((node, i) => {
    const { x, y, index, coordinates = [], color = "black" } = node;

    const geometry = getGeometry(node);
    const pathData = pathFunc(geometry);
    if (!hasHeight) return null;
    return (
      <Fragment key={index}>
        {/* <circle
          r={3}
          style={{ fillOpacity: 0.9, fill: color }}
          transform={`translate(${x}, ${y})`}
        /> */}
        <path d={pathData} style={{ fill: "#666", opacity: 0.4 }} />
      </Fragment>
    );
  });
  return (
    <svg
      style={{
        display: "block",
        height: "100%",
        width: "100%"
      }}
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
      <button onClick={() => dispatch({ type: STOP })}>stop</button>
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

// setTimeout(() => dispatch({ type: RESTART }), 400)