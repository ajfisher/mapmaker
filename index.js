const D3Node = require('d3-node');
const d3 = require('d3');
const fs = require('fs');

const width = 1000;
const height = 700;

const site_num = 500;

const show_initial_points = false;

const styles = `
circle {
    fill-opacity: 0.9;
    r: 2;
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
    stroke-width: 0.5px;
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
var poly_queue = []; // used to hold queue of polygons for processing
var color = d3.scaleSequential(d3.interpolateViridis);

function create_island() {

    // creates an island at a random point.
    let startpoly = diagram.find(
        Math.random() * width,
        Math.random() * height
    ).index;

    let highpoint = (Math.random() * 0.5) + 0.5; // bind between 0.5 and 1
    let radius = (Math.random() * 0.1) + 0.899; // bind between 0.9 and 0.999
    let sharpness = (Math.random() * 0.5); // bind between 0 - 0.5

    console.log(startpoly, highpoint, radius, sharpness);
    polygons[startpoly].height = highpoint;
    polygons[startpoly].used = true;
    poly_queue.push(startpoly);

    // put heights around the island values
    for (let i = 0; i < poly_queue.length && highpoint > 0.01; i++) {

        highpoint = highpoint * radius;

        // get each of the neighbours of the start poly and iterate overthem
        diagram.cells[ poly_queue[i] ].halfedges.forEach( (e) => {
            console.log(e);
            if (typeof(polygons[e]) === 'undefined') {
                return;
            } else if (! polygons[e].used) {
                console.log("setting a height");
                polygons[e].height = polygons[e].height + height;

                // set a maximum height to 1.0
                if (polygons[e].height > 1) {polygons[e].height = 1.0;}
                polygons[e].used = true;

                poly_queue.push(e);
            }
        });
    }

    console.log(diagram.cells[0]);
    console.log(sites[0])
    console.log(polygons[0]);
    console.log(poly_links[0]);


    polys.attr('fill', (d, i) => { 
        if (polygons[i].height) {
            console.log("height set");
            return "grey";
        } else {
            return "blue";
        }
    });
    // colour the polygons based on height

}


function colour_polys() {
    // sets the colour of the polygons based on height map.

    polygons.map(i => {
        //console.log(i);
    });
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
    polygons.forEach( p => { p.used = false; });

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

    // add the circles
    var sites_points = svg.append("g")
        .attr("class", "sites")
        .selectAll('sites')
        .data(sites)
        .enter()
        .append('circle')
        .attr("cx", d => d[0] )
        .attr("cy", d => d[1] );

    create_island();

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

