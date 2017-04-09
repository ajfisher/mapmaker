const D3Node = require('d3-node');
const d3 = require('d3');
const fs = require('fs');

const width = 1440;
const height = 900;

const site_num = 5000;

var sites = [];

function generate_map() {
    console.log("generating map");

    sites = d3.range(site_num).map( () => {
        return [
            Math.random() * width * 0.98 + width * 0.01,
            Math.random() * height * 0.98 + height * 0.01
        ];

    });

    svg.append('rect')
        .attr('class', 'background')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    var voronoi = d3.voronoi().extent([ [0, 0], [width, height] ]);
    var diagram = voronoi(sites);

    // show the cells
    var polygons = svg.append("g")
        .attr("class", "tessel")
        .selectAll("path")
        .data(voronoi.polygons(sites))
        .enter()
        .append('path')
        .attr('d', d => ("M" + d.join("L") + "Z"));

    // now show the links
    var links = svg.append("g")
        .attr("class", "delaunay")
        .selectAll("line")
        .data(voronoi.links(sites))
        .enter()
        .append("line")
        .attr('x1', d => d.source[0])
        .attr('y1', d => d.source[1])
        .attr('x2', d => d.target[0])
        .attr('y2', d => d.target[1]);

    // add the circles
    var sites_group = svg.append("g")
        .attr("class", "sites");

    var sites_circles = sites_group.selectAll('sites')
        .data(sites)
        .enter()
        .append('circle')
        .attr("cx", d => d[0] )
        .attr("cy", d => d[1] );

}


const styles = `
circle {
    fill: crimson;
    fill-opacity: 0.9;
    r: 1;
}

rect.background {
    fill: antiquewhite;
}

g.tessel path {
    stroke: ivory;
    fill: none;
    stroke-width: 0.5px;
}

g.delaunay line {
    stroke-width: 0.2px;
    stroke: darkslategrey;
}

`;

var options = {
  svgStyles: styles,
  d3Module: d3
};

var d3n = new D3Node(options);

var svg = d3n.createSVG()
    .attr("width", width)
    .attr("height", height)
    .append("g")

generate_map();

// create output files
fs.writeFile('output.svg', d3n.svgString(), (err) => {
	console.log("File output complete");
});

