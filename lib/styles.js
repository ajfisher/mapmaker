// used to hold the various styles for the SVG.
const styles = `
circle {
    fill-opacity: 0.9;
    r: 1;
}

g.sites circle {
    fill: crimson;
}

rect.background {
    fill: antiquewhite;
}

g.tessel path {
    stroke: ivory;
    //fill: none;
    stroke-width: 0.2px;
    stroke-opacity: 0.05;
    fill-opacity: 0.8;
}

g.tessel path.land {
    fill: coral;
}

g.tessel path.sea {
    fill: cadetblue;
}

g.delaunay line {
    stroke-width: 0.2px;
    stroke: darkslategrey;
    opacity: 0.5;
}

g.coastline path {
    stroke: black;
    stroke-width: 1px;
    stroke-linecap: round;
    fill: none;
}

g.contour path {
    stroke: darkslategrey;
    stroke-width: 0.3px;
    stroke-linecap: round;
    fill: none;
}
`;

module.exports = styles;
