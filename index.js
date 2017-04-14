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

const site_num = 400;
const num_islands = process.argv[2] || 10;

const show_initial_points = false;

const show = {
    site_points: true,
    links: false,
    polys: false,
    tripolys: true,
    vertices: true,
    v_edges: true,
    msl: 0.1,
};

const options = {
  svgStyles: styles,
  d3Module: d3
};

const d3n = new D3Node(options);

var mesh;
var diagram, polygons;
var polys, poly_links;
var tris;
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

    if (show.tripolys) {
        // show the triangle polys
        let tris = svg.append("g")
            .attr("class", "tris")
            .selectAll("path")
            .data(mesh.tris)
            .enter()
            .append("path")
            .attr('id', (d,i) => i)
            .attr('d', d => ("M" + d.join("L") + "Z"))
            .attr('fill', (d, i) => color(i/site_num) );
    }
    if (show.polys) {
        // show the cells
        polys = svg.append("g")
            .attr("class", "tessel")
            .selectAll("path")
            .data(mesh.voronoi.polygons())
            .enter()
            .append('path')
            .attr('id', (d,i) => i)
            .attr('d', d => ("M" + d.join("L") + "Z"))
            //.attr('fill', (d, i) => color(i/site_num) );
    }

    if (show.v_edges) {
        polys = svg.append("g")
            .attr("class", "vedge")
            .selectAll("vedges")
            .data(mesh.edges)
            .enter()
            .append("line")
            .attr('x1', d => mesh.vertices[d[0]][0])
            .attr('y1', d => mesh.vertices[d[0]][1])
            .attr('x2', d => mesh.vertices[d[1]][0])
            .attr('y2', d => mesh.vertices[d[1]][1]);
    }

    if (show.vertices) {
        // show the vertices of the polygons
        let vertices = svg.append("g")
            .attr("class", "vertices")
            .selectAll("vertices")
            .data(mesh.vertices)
            .enter()
            .append('circle')
            .attr("cx", d => d[0] )
            .attr("cy", d => d[1] )
    }

    if (show.links) {
        // now show the links
        let links = svg.append("g")
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
            .data(mesh.points)
            .enter()
            .append('circle')
            .attr("cx", d => d[0] )
            .attr("cy", d => d[1] );
    }
}

function initialise_mesh() {
    // iniitalise the mesh with all the baseline data in one place

    console.log("initialising mesh data");
    // create the initial set of points.
    sites = d3.range(site_num).map( () => {
        return [
            Math.random() * width * 0.98 + width * 0.01,
            Math.random() * height * 0.98 + height * 0.01
        ];

    });

    var voronoi = d3.voronoi().extent([ [0, 0], [width, height] ]);

    // apply a layer of relaxation to the sites in order to make them less clumpy
    sites = voronoi(sites).polygons().map(d3.polygonCentroid);

    let vor = voronoi(sites);
    diagram = vor;
    let vertexids = {};
    let vertices = [];
    let edges = [];
    let tris = [];
    let adj_vx = []; // map of connections between vertices

    vor.edges.forEach( (e, i) => {

        // some edges are not defined as they go "off" the screen
        if (typeof (e) === 'undefined') return;

        // get the 2 vertices of the edge and see if it's a position we know
        // about yet or not. If we don't know about it (undefined in the KV map)
        // then we add it to the list of all the vertices in the graph.

        let v0 = vertexids[e[0]];
        let v1 = vertexids[e[1]];

        if (v0 == undefined) {
            v0 = vertices.length;
            vertexids[e[0]] = v0;
            vertices.push(e[0]);
        }

        if (v1 == undefined) {
            v1 = vertices.length;
            vertexids[e[1]] = v1;
            vertices.push(e[1]);
        }

        // now consider the points that are adjacent to each other and
        // build up an adjancency map.
        adj_vx[v0] = adj_vx[v0] || []; // check if vertex has adjacent vertices if not make a list
        adj_vx[v0].push(v1);
        adj_vx[v1] = adj_vx[v1] || []; // as above but other end of the edge
        adj_vx[v1].push(v0);
        // create a list of edges and the polygons they reference on either side
        // of that edge.
        edges.push([v0, v1, e.left, e.right]);

        // look at the edge and the polygons it separates and put the polygon
        // coordinates into the triangle list. (as a triangle will be the
        // edge between two polygons subtending the polygon coords).
        tris[v0] = tris[v0] || []
        if (! tris[v0].includes(e.left)) {
            tris[v0].push(e.left);
        }
        if (e.right && ! tris[v0].includes(e.right)) {
            tris[v0].push(e.right);
        }
        tris[v1] = tris[v1] || []
        if (! tris[v1].includes(e.left)) {
            tris[v1].push(e.left);
        }
        if (e.right && ! tris[v1].includes(e.right)) {
            tris[v1].push(e.right);
        }


    });
    // `vertices` is now a list of all vertex points in the graph
    // `vertexids` is a mapping between these points and their index in the 
    //      `vertices` array.
    // `adj_vx` is a list of vertices that are linked to each other by edges
    // `tris` is a list of points for each triangle

    mesh = {
        points: sites,
        voronoi: diagram,
        tris: tris,
        edges: edges,
        vertices: vertices,
        adjacent_vx: adj_vx,
    };

    // if we do an operation on the mesh, apply it to the vertices
    mesh.map = function (f) {
        var mapped = vertices.map(f);
        mapped.mesh = mesh;
        return mapped;
    };

    // TODO refactor this out.
    /**polygons = diagram.polygons();
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

    });**/

}


function generate_map() {
    console.log("generating map");


    svg.append('rect')
        .attr('class', 'background')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    initialise_mesh();
    draw_mesh();

/**    draw_mesh();

    for (let i = 0; i < num_islands; i++) {
        if (i < 2) {
            create_island({first_land: true});
        } else {
            create_island();
        }
        reset_poly_state();
    }

    draw_coastline();
    colour_polys();**/
}

var svg = d3n.createSVG()
    .attr("width", width)
    .attr("height", height)
    .append("g")

generate_map();

// create output files
fs.writeFile('output.svg', d3n.svgString(), (err) => {
	console.log("File output complete");
});

