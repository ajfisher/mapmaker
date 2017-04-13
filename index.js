const fs = require('fs');

const _ = require('lodash');
const d3 = require('d3');
const d3c = require('d3-scale-chromatic');
const D3Node = require('d3-node');

const seedrandom = require('seedrandom');
const rng = seedrandom('testing scenario2.', { global: true });

const width = 1350;
const height = 780;

const site_num = 10000;
const num_islands = process.argv[2] || 10;

const show_initial_points = false;

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

g.delaunay line {
    stroke-width: 0.2px;
    stroke: darkslategrey;
    opacity: 0.5;
}
`;

var diagram, polygons;
var polys, poly_links;
var sites = [];
//var poly_queue = []; // used to hold queue of polygons for processing
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
        // build a skewed towards a bigger initial island
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

    // colour the polygons based on height

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
    console.log(min.height, max.height);
    let scale = d3.scaleLinear().domain([min.height, max.height]).range([0, 1]);
    //polys.attr('fill', d => color(1 - scale(d.height) ) );
    polys.attr('fill', d => color(1 - d.height ) );
}

function draw_coast() {
    // sets a coastline
    let shoreline = [];

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


    // now show the links
/**    var links = svg.append("g")
        .attr("class", "delaunay")
        .selectAll("line")
        .data(poly_links)
        .enter()
        .append("line")
        .attr('x1', d => d.source[0])
        .attr('y1', d => d.source[1])
        .attr('x2', d => d.target[0])
        .attr('y2', d => d.target[1]);
**/
    // add the circles
/**    var sites_points = svg.append("g")
        .attr("class", "sites")
        .selectAll('sites')
        .data(sites)
        .enter()
        .append('circle')
        .attr("cx", d => d[0] )
        .attr("cy", d => d[1] );
**/

    for (let i = 0; i < num_islands; i++) {
        if (i == 0) {
            create_island({first_land: true});
        } else {
            create_island();
        }
        reset_poly_state();
    }

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

