const fs = require('fs');

const _ = require('lodash');
const d3 = require('d3');
const d3c = require('d3-scale-chromatic');
const D3Node = require('d3-node');

const seedrandom = require('seedrandom');
const rng = seedrandom('testing scenario2.', { global: true });

const width = 1000;
const height = 700;

const site_num = 8000;
const num_islands = 5;

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
    stroke-opacity: 0.5;
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
var color = d3.scaleSequential(d3c.interpolateSpectral); //interpolateViridis);

function create_island() {

    // creates an island at a random point.
    let startpoly = diagram.find(
        Math.random() * (0.8 * width) + (0.1 * width),
        Math.random() * ( 0.8 * height) + (0.1 * height)
    ).index;

    let highpoint = (Math.random() * 0.5) + 0.5; // bind between 0.5 and 1
    let radius = (Math.random() * 0.1) + 0.899; // bind between 0.9 and 0.999
    let sharpness = (Math.random() * 0.5); // bind between 0 - 0.5

    let poly_queue = [];

    console.log(startpoly, highpoint, radius, sharpness);
    polygons[startpoly].height = highpoint;
    polygons[startpoly].used = true;
    poly_queue.push(startpoly);

    // put heights around the island values
    for (let i = 0; i < poly_queue.length && highpoint > 0.01; i++) {

        //highpoint = polygons[ poly_queue[i] ].height * radius;
        highpoint = highpoint * radius;

        // get each of the neighbours of the start poly and iterate overthem
        polygons[ poly_queue[i] ].neighbours.forEach( (e) => {
            if (! polygons[e].used) {
                //calculate a modifier for the height
                let h_mod = Math.random() * sharpness + 1.1 - sharpness;
                if (sharpness == 0) { h_mod = 1; } // deal with boundary case


                // this is currently wrong and needs some additional work on this.
                //polygons[e].height = polygons[e].height + highpoint;// * h_mod;
                polygons[e].height = polygons[e].height * h_mod;
                //console.log(highpoint, h_mod, highpoint * h_mod, polygons[e].height);
                //console.log(polygons[e].height);
                // set a maximum height to 1.0
                if (polygons[e].height > 1) {
                    polygons[e].height = 1.0;
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
        create_island();
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

