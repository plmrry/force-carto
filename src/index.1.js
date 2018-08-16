// @ts-check
import React, { createElement as h, Component, Fragment } from "react";
import ReactDOM from "react-dom";
import Measure from "react-measure";
import update from "immutability-helper";
import * as d3 from "d3";

let STATE = {};

const SIZE = "SIZE";
const SET_STATE = "SET_STATE";
const TICK = "TICK";
const NODES = "NODES";
const START = "START";
const RESTART = "RESTART";

function createForceMiddleware({ dispatch, setState, getState }) {
  const radiusBase = 20;
  const numNodes = 20
  const nodes = d3
    .range(numNodes)
    .map(p => ({ radius: d3.scaleLinear().range([5, 20])(Math.random()) }));
  const positionStrength = 0
  const forceX = d3.forceX().strength(positionStrength);
  const forceY = d3.forceY().strength(positionStrength)
  const collideStrength = 0.6;
  const forceCollide = d3.forceCollide(d => d.radius).strength(collideStrength);
  const force = d3
    .forceSimulation(nodes)
    .alphaTarget(0.01)
    // .force("center", forceCenter)
    // .force("x", forceX)
    // .force("y", forceY)
    .force("collide", forceCollide)
    .on("tick", () => dispatch({ type: NODES, payload: nodes }))
    .stop();
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
  // console.log("DISPATCH", action);
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
      </g>
    );
  });
  return (
    <svg style={{ display: "block", height: "100%", width: "100%" }}>
      <g transform={`translate(${width / 2}, ${height / 2})`}>{circles}</g>
    </svg>
  );
}

function App(props) {
  const { dispatch = () => {}, height, width } = props;

  const divHeight = height ? `${height}px` : "50vh";
  const divWidth = width ? `${width}px` : "100%";

  // console.log("props", props, { divHeight, divWidth });

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

// var nodes = [].concat(
//   d3.range(80).map(function() {
//     return { type: "a" };
//   }),
//   d3.range(160).map(function() {
//     return { type: "b" };
//   })
// );

// var node = d3
//   .select("svg")
//   .append("g")
//   .selectAll("circle")
//   .data(nodes)
//   .enter()
//   .append("circle")
//   .attr("r", 2.5)
//   .attr("fill", function(d) {
//     return d.type === "a" ? "brown" : "steelblue";
//   });

// var simulation = d3
//   .forceSimulation(nodes)
//   //     .force("charge", d3.forceCollide().radius(5))
//   .force(
//     "r",
//     d3.forceRadial(function(d) {
//       return d.type === "a" ? 100 : 200;
//     })
//   )
//   .on("tick", ticked);

// function ticked() {
//   node
//     .attr("cx", function(d) {
//       return d.x;
//     })
//     .attr("cy", function(d) {
//       return d.y;
//     });
// }

function setState(fn = s => s) {
  STATE = fn(STATE);
  // console.log("NEW STATE", STATE);
  ReactDOM.render(
    h(App, { ...STATE, dispatch }),
    document.getElementById("root")
  );
}

dispatch({ type: START });
