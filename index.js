const fs = require('fs');

const _ = require('lodash');
const d3 = require('d3');
const d3c = require('d3-scale-chromatic');
const D3Node = require('d3-node');

const seedrandom = require('seedrandom');
const rng = seedrandom('test scenario2.', { global: true });

const styles = require('./lib/styles');

const width = 1350;
const height = 780;

const site_num = 15000;
const num_islands = process.argv[2] || 10;

const show_initial_points = false;

const show = {
    site_points: false,
    links: false,
    polys: true,
    msl: 0.1,
};

var diagram, polygons;
var polys, poly_links;
var sites = [];
var coastline;

var color = d3.scaleSequential(d3c.interpolateSpectral);

function create_island(options) {

    let opts = options || {};

    let first_land = opts.first_land || false;

    // creates an island at a random point.
    let startpoly = diagram.find(
        Math.random() * (0.6 * width) + (0.2 * width),
        Math.random() * ( 0.6 * height) + (0.2 * height)
    ).index;

    let highpoint, radius;

    if (first_land) {
        // build skewed towards a bigger initial island
        highpoint = (Math.random() * 0.2) + 0.8; // bind between 0.8 and 1
        radius = (Math.random() * 0.05) + 0.95; // bind between 0.95 and 0.999
    } else {
        highpoint = (Math.random() * 0.5) + 0.5; // bind between 0.5 and 1
        radius = (Math.random() * 0.3) + 0.7; // bind between 0.95 and 0.999
    }
    let gradient = (Math.random() * 0.55) + 0.2; // bind between 0.2 - 0.75
    //highpoint = 0.9;
    //radius = 0.75;
    //gradient = 0.25;

    let poly_queue = [];

    console.log(startpoly, highpoint, radius, gradient);
    polygons[startpoly].height = highpoint;
    polygons[startpoly].used = true;
    poly_queue.push(startpoly);

    // put heights around the island values
    for (let i = 0; i < poly_queue.length && highpoint > 0.01; i++) {

        if (first_land) {
            highpoint = polygons[ poly_queue[i] ].height * radius;
        } else {
            highpoint = highpoint * radius;
        }

        // get each of the neighbours of the start poly and iterate overthem
        polygons[ poly_queue[i] ].neighbours.forEach( (e) => {
            if (! polygons[e].used) {
                //calculate a modifier for the height
                let h_mod = Math.random() * gradient + 1.1 - gradient;
                if (gradient == 0) { h_mod = 1; } // deal with boundary case

                // this is currently wrong and needs some additional work on this.
                polygons[e].height = polygons[e].height + highpoint * h_mod;

                if (polygons[e].height > 1.0) {
                    polygons[e].height = 1;
                }

                polygons[e].used = true;

                poly_queue.push(e);
            }
        });
    }
}

function draw_coastline(level) {

    let msl = level || show.msl; // level set for sea level.

    let c_data = contour(msl);

    // now append to the SVG.
    coastline = svg.append("g")
        .attr("class", "coastline")
        .append("path")
        .attr("d", c_data.line + "Z");
}

function draw_contour(height) {
    // draws a contour line.

    let c_data = contour(height);
    // now append to the SVG.
    coastline = svg.append("g")
        .attr("class", "contour")
        .append("path")
        .attr("d", c_data.line + "Z");
}

function contour(height) {
    // used to draw a contour line at the given height
    //
    let h = height || 0.9;

    let contour_line = "";
    let contour_edges = [];

    polygons.forEach( (p, i) => {
        if (p.height > h) {

            diagram.cells[i].halfedges.forEach( e => {
                let edge = diagram.edges[e];
                // look at the cells either side of the edge we're looking at
                if (edge.left && edge.right) {
                    let edgeidx = edge.left.index;
                    // check not self
                    if (edgeidx === i) {
                        edgeidx = edge.right.index; // get the other if it is self
                    }
                    // now check the other polygon and as we're already HIGHER
                    // than H, if this is LOWER than H then by definition
                    // this edge is the boundary between the two.
                    if (polygons[edgeidx].height < h) {
                        contour_line = contour_line + "M" + edge.join("L");
                        //more experimentation needed here
                        /**svg_line = svg_line + "M" + edge[0];
                        svg_line += "Q"
                        svg_line += edge[0][0] + ((edge[0][0] - polygons[edgeidx].data[0]) *0.5) + ',';
                        svg_line += edge[0][1] + ((edge[0][1] - polygons[edgeidx].data[1]) *0.5);
                        svg_line += ", " + edge[1];**/
                        contour_edges.push(edge);
                    }
                }
            });
        }
    });

    return ( { edges: contour_edges, line: contour_line });
}


function reset_poly_state() {
    // resets the polygons "dirty" state back to normal

    polygons.forEach( d => {
        d.used = false;
    });
}

function colour_polys() {
    // sets the colour of the polygons based on height map.

    let min = _.minBy(polygons, 'height');
    let max = _.maxBy(polygons, 'height');
    //console.log(min.height, max.height);
    let scale = d3.scaleLinear().domain([min.height, max.height]).range([0, 1]);
    if (show.polys ) {
        //polys.attr('fill', d => color(1 - scale(d.height) ) );
        polys.attr('fill', d => color(1 - d.height ) );
        /**polys.attr('class', d => {
            if ( d.height < 0.2 ) {
                return "sea";
            } else {
                return "land";
            }
        });**/
    }
}

function draw_mesh() {
    // used to draw the mesh structure of the map

    if (show.polys) {
        // show the cells
        polys = svg.append("g")
            .attr("class", "tessel")
            .selectAll("path")
            .data(polygons)
            .enter()
            .append('path')
            .attr('id', (d,i) => i)
            .attr('d', d => ("M" + d.join("L") + "Z"))
            .attr('fill', (d, i) => color(i/site_num) );
    }

    if (show.links) {
        // now show the links
        var links = svg.append("g")
            .attr("class", "delaunay")
            .selectAll("line")
            .data(poly_links)
            .enter()
            .append("line")
            .attr('x1', d => d.source[0])
            .attr('y1', d => d.source[1])
            .attr('x2', d => d.target[0])
            .attr('y2', d => d.target[1]);
    }

    if (show.site_points) {
        // add the points for the sites
        var sites_points = svg.append("g")
            .attr("class", "sites")
            .selectAll('sites')
            .data(sites)
            .enter()
            .append('circle')
            .attr("cx", d => d[0] )
            .attr("cy", d => d[1] );
    }
}

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
    sites = voronoi(sites).polygons().map(d3.polygonCentroid);
    diagram = voronoi(sites);
    polygons = diagram.polygons();
    poly_links = diagram.links();

    // do some initialisation;
    polygons.forEach( (p, i) => {
        // set up for being used later
        p.used = false;
        p.height = 0;

        // determine polygon neighbours
        p.index = i;

        let neighbours = [];
        diagram.cells[i].halfedges.forEach( (e) => {
            let edge = diagram.edges[e];
            if (edge.left && edge.right) {
                edgeidx = edge.left.index;
                if (edgeidx === i) {
                    // we're pointing at ourselves
                    edgeidx = edge.right.index;
                }
                neighbours.push(edgeidx);
            }
        });
        p.neighbours = neighbours;

    });

    draw_mesh();

    for (let i = 0; i < num_islands; i++) {
        if (i < 2) {
            create_island({first_land: true});
        } else {
            create_island();
        }
        reset_poly_state();
    }

    draw_coastline();
    colour_polys();
}



const options = {
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

