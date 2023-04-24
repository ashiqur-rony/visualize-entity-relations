/**
 * D3 Module
 * Creates a visualization from the CSV data
 *
 * @author Ashiqur Rahman
 * @author_url http://ashiqur.com
 **/

import * as d3 from "https://cdn.skypack.dev/d3@7";

// Define the global variables for the visualization
let combined_data, entities, nouns, renders, en_persons, en_when, en_where, en_what, x_variable = 'MPG',
    y_variable = 'Horsepower', cars_color, attributes, axis_keys;

let show_what = d3.select('#show-what').property('checked');
let box_cutoffs = [0, 0, 0, 0];

// Default values for the filters
let default_filter = {
    'Model': false,
    'Origin': false,
    'MPG': false,
    'Cylinders': false,
    'Displacement': false,
    'Horsepower': false,
    'Weight': false,
    'Acceleration': false,
    'Year': false
}
// Active filters at any point of time
let active_filter = {...default_filter};

/**
 * Window is ready, let's go...
 */
window.onload = function () {
    load_data();
};

/**
 * Load the data from the CSV file
 * @param type
 */
function load_data(type) {
    Promise.all([
        d3.csv("resources/data/combined_data_with_nlp_features.csv"),
        d3.csv("resources/data/entities.csv"),
        d3.csv("resources/data/nouns.csv"),
        d3.csv("resources/data/renders.csv")
    ]).then(createVisualization);

    d3.select('#show-what').on('change', function () {
        show_what = d3.select('#show-what').property('checked');
        redraw_visualization();
    });

    d3.select('#reset-button').on('click', function () {
        redraw_visualization();
    });
}

/**
 * Function to create the visualization
 * This function cleans up the data, creates the dropdowns for the axis, color legends and hands over the data to the draw function
 * @param data array of CSV data elements
 */
function createVisualization(data) {

    // Clean up the data
    // Load the original data from CSV
    combined_data = data[0].map((d) => {
        return {
            'source': d.source.trim(),
            'date': d.date.trim(),
            'text': d.text.trim(),
            'file': d.file.trim(),
        }
    });

    // Load the entities data from CSV
    entities = data[1].map((d) => {
        return {
            'file': d.file.trim(),
            'entity': d.entity.trim(),
            'entity_type': d.entity_type.trim(),
        }
    });

    // Load the noun phrases from CSV
    nouns = data[2].map((d) => {
        return {
            'file': d.file.trim(),
            'phrase': d.phrase.trim(),
            'in_entity': d.in_entity.trim(),
        }
    });

    // Load the NER renders for the source files
    renders = data[3].map((d) => {
        return {
            'file': d.file.trim(),
            'render': d.render,
        }
    });

    // Populate datalist for car models
    en_persons = [...new Set(entities.filter(d => d.entity_type === 'PERSON').map(d => d.entity))];
    en_where = [...new Set(entities.filter(d => d.entity_type === 'GPE').map(d => d.entity))];
    en_when = [...new Set(entities.filter(d => d.entity_type === 'DATE').map(d => d.entity))];
    en_what = [...new Set(entities.filter(d => d.entity_type === 'VERB').map(d => d.entity))];

    // Attributes of the SVG visualization
    attributes = {
        width_svg: 960,
        height_svg: (show_what ? (d3.max([en_persons.length, en_where.length, en_when.length, en_what.length]) * 20 + 40) : (d3.max([en_persons.length, en_where.length, en_when.length]) * 20) + 40),
        margin: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        },
        axis: {
            x: 50,
            y: 50
        }
    };

    // Draw the visualization
    draw_activity_visualization();
}

/**
 * Function to draw the diagram with entity activity connections.
 * The function draws a column of box for each entity types and connects the entities with lines.
 */
function draw_activity_visualization() {

    // Create the SVG canvas
    let entity_svg = d3.selectAll('#entity-visualization')
        .append('svg')
        .attr('width', attributes.width_svg)
        .attr('height', attributes.height_svg)
        .attr('viewBox', [0, 0, attributes.width_svg, attributes.height_svg])
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Transition
    const t = entity_svg.transition().duration(750);

    // Determine the start positions for the boxes
    box_cutoffs = [0, 0.28, 0.55, 0.83];
    if (!show_what) {
        box_cutoffs = [0, 0.41, 0.82, 1];
    }

    // Draw the entities
    drawEntities(en_persons, 'WHO', entity_svg, (attributes.width_svg * box_cutoffs[0] + 10), t);
    drawEntities(en_where, 'WHERE', entity_svg, (attributes.width_svg * box_cutoffs[1] + 10), t);
    drawEntities(en_when, 'WHEN', entity_svg, (attributes.width_svg * box_cutoffs[2] + 10), t);

    if (show_what) {
        drawEntities(en_what, 'WHAT', entity_svg, (attributes.width_svg * box_cutoffs[3] + 10), t);
    }

    // Draw the connections
    drawEntityConnections(entity_svg);
}

/**
 * Function to draw the entities
 * @param entity_items array of entities
 * @param entity_type type of the entity
 * @param entity_svg svg element
 * @param x_position x position of the entity
 * @param transition transition animation
 */
function drawEntities(entity_items, entity_type, entity_svg, x_position, transition) {
    // Draw the PERSON entities
    const entity_label = entity_svg
        .append('text')
        .attr('class', 'entity-label entity-label-' + entity_type.toLowerCase())
        .attr('x', x_position)
        .attr('y', '12')
        .attr('font-size', '15')
        .attr('font-weight', 'bold')
        .text(entity_type);
    const entity_groups = entity_svg
        .selectAll('.entity-box-' + entity_type.toLowerCase())
        .data(entity_items)
        .join('g')
        .attr('class', d => 'entity-box entity-box-' + entity_type.toLowerCase() + ' entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .append('rect')
        .attr('class', d => 'rect rect-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-rect entity-rect-' + entity_type.toLowerCase())
        .on('mouseover', handleMouseOverRect)
        .on('mouseout', handleMouseOutRect)
        .on('click', handleMouseClickRect)
        .attr('x', x_position)
        .attr('y', (d, i) => 10 + (i + 1) * 20)
        .attr('width', '150')
        .attr('height', '15')
        .attr('opacity', 0.7)
        .transition(transition)
        .attr('data-person', d => d)
        .attr('data-entity-type', entity_type.toLowerCase())
        .attr('data-files', d => {
            return [...new Set(entities.filter(e => e.entity === d).map(e => e.file))];
        });
    const entity_texts = entity_svg
        .selectAll('.entity-box-' + entity_type.toLowerCase())
        .data(entity_items)
        .append('text')
        .attr('class', 'entity-text entity-text-' + entity_type.toLowerCase())
        .attr('x', x_position + 5)
        .attr('y', (d, i) => 22 + (i + 1) * 20)
        .text(d => d)
        .transition(transition);
}

function drawEntityConnections(entity_svg) {
    // Draw the WHO - WHERE connections
    en_persons.forEach(p => {
        let x_pos_from = 150 + 10;
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[1] + 10;
        let y_pos_to = 0;

        // Get the files where the person is mentioned
        let entity_files = entities.filter(e => {
            return (e.entity === p && e.entity_type === 'PERSON');
        }).map(e => e.file);

        // Get the locations where the person is mentioned
        let where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && entity_files.includes(e.file))).map(e => e.entity))];

        // Draw the connections between the person and location
        if (where_items.length > 0) {
            where_items.forEach(w => {
                y_pos_from = 15 + (en_persons.indexOf(p) + 1) * 20;
                y_pos_to = 15 + (en_where.indexOf(w) + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-who-where entity-connection-from-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', where_items.length)
                    .attr('fill', 'none');
            });
        }
    });

    // Draw the WHERE - WHEN connections
    en_where.forEach(w => {
        let x_pos_from = 150 + attributes.width_svg * box_cutoffs[1] + 10;
        let y_pos_from = 0;
        let x_pos_to = attributes.width_svg * box_cutoffs[2] + 10;
        let y_pos_to = 0;

        // Get the files where the location is mentioned
        let entity_files = entities.filter(e => {
            return (e.entity === w && e.entity_type === 'GPE');
        }).map(e => e.file);

        // Get the dates where the location is mentioned
        let when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && entity_files.includes(e.file))).map(e => e.entity))];

        // Draw the connections between the location and date
        if (when_items.length > 0) {
            when_items.forEach(d => {
                y_pos_from = 15 + (en_where.indexOf(w) + 1) * 20;
                y_pos_to = 15 + (en_when.indexOf(d) + 1) * 20;

                const link = d3.linkHorizontal()({
                    source: [x_pos_from, y_pos_from],
                    target: [x_pos_to, y_pos_to]
                });

                entity_svg.append('path')
                    .attr('d', link)
                    .attr('class', 'entity-connection entity-connection-where-when entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    //.attr('stroke-width', when_items.length)
                    .attr('fill', 'none');
            });
        }
    });

    if (show_what) {
        // Draw the WHEN - WHAT connections
        en_when.forEach(d => {
            let x_pos_from = 150 + attributes.width_svg * box_cutoffs[2] + 10;
            let y_pos_from = 0;
            let x_pos_to = attributes.width_svg * box_cutoffs[3] + 10;
            let y_pos_to = 0;

            // Get the files where the date is mentioned
            let entity_files = entities.filter(e => {
                return (e.entity === d && e.entity_type === 'DATE');
            }).map(e => e.file);

            // Get the events where the date is mentioned
            let what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && entity_files.includes(e.file))).map(e => e.entity))];

            // Draw the connections between the date and event
            if (what_items.length > 0) {
                what_items.forEach(e => {
                    y_pos_from = 15 + (en_when.indexOf(d) + 1) * 20;
                    y_pos_to = 15 + (en_what.indexOf(e) + 1) * 20;

                    const link = d3.linkHorizontal()({
                        source: [x_pos_from, y_pos_from],
                        target: [x_pos_to, y_pos_to]
                    });

                    entity_svg.append('path')
                        .attr('d', link)
                        .attr('class', 'entity-connection entity-connection-when-what entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' entity-connection-to-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        //.attr('stroke-width', what_items.length)
                        .attr('fill', 'none');
                });
            }
        });
    }
}

/**
 * Handle the mouse over event on a rectangle.
 * @param d
 * @param i
 */
function handleMouseOverRect(d, i) {
    const entity_svg = d3.selectAll('#entity-visualization').select('svg');
    let who_items, when_items, where_items, what_items;

    // Dim all rectangles
    d3.selectAll('.entity-rect')
        .style('opacity', 0.1);

    // Highlight the current rectangle
    d3.select(d.target)
        .style('opacity', 1)
        .style('stroke-width', '1px')
        .style('stroke', 'black');

    // Highlight the connections
    // console.log(d, i);
    // console.log(d.target);
    let entity_type = d3.select(d.target).attr('data-entity-type');
    let entity_files = d3.select(d.target).attr('data-files').split(',');

    d3.selectAll('.entity-connection')
        .style('opacity', 0.05);
    // Highlight the connections
    d3.selectAll('.entity-connection-from-' + i.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .style('opacity', 1);
    d3.selectAll('.entity-connection-to-' + i.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .style('opacity', 1);

    if (entity_type === 'who') {
        // Highlight the connected WHERE rectangles
        where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && entity_files.includes(e.file))).map(e => e.entity))];
        console.log(where_items);
        where_items.forEach(w => {
            d3.selectAll('.entity-box-where.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            // Highlight the connected WHEN rectangles
            let where_when_entity_files = entities.filter(e => {
                return (e.entity === w && e.entity_type === 'GPE');
            }).map(e => e.file);
            when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && where_when_entity_files.includes(e.file))).map(e => e.entity))];

            when_items.forEach(d => {
                d3.selectAll('.entity-box-when.entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);

                if (show_what) {
                    // Highlight the connected WHAT rectangles
                    let when_what_entity_files = entities.filter(e => {
                        return (e.entity === d && e.entity_type === 'DATE');
                    }).map(e => e.file);

                    what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && when_what_entity_files.includes(e.file))).map(e => e.entity))];
                    what_items.forEach(e => {
                        d3.selectAll('.entity-box-what.entity-box-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                            .style('opacity', 1)
                            .style('stroke-width', '1px')
                            .style('stroke', 'black');

                        // Highlight the connections
                        d3.selectAll('.entity-connection-from-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                            .style('opacity', 1);
                        d3.selectAll('.entity-connection-to-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                            .style('opacity', 1);
                    });
                }
            });
        });

    } else if (entity_type === 'where') {
        // Highlight the connected WHO rectangles
        who_items = [...new Set(entities.filter(e => (e.entity_type === 'PERSON' && entity_files.includes(e.file))).map(e => e.entity))];

        who_items.forEach(w => {
            d3.selectAll('.entity-box-who.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
        });

        // Highlight the connected WHEN rectangles
        when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && entity_files.includes(e.file))).map(e => e.entity))];

        when_items.forEach(d => {
            d3.selectAll('.entity-box-when.entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            if (show_what) {
                // Highlight the connected WHAT rectangles
                let when_what_entity_files = entities.filter(e => {
                    return (e.entity === d && e.entity_type === 'DATE');
                }).map(e => e.file);

                what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && when_what_entity_files.includes(e.file))).map(e => e.entity))];
                what_items.forEach(w => {
                    d3.selectAll('.entity-box-what.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1)
                        .style('stroke-width', '1px')
                        .style('stroke', 'black');

                    // Highlight the connections
                    d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                    d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                });
            }
        });

    } else if (entity_type === 'when') {
        if (show_what) {
            // Highlight the connected WHAT rectangles
            what_items = [...new Set(entities.filter(e => (e.entity_type === 'VERB' && entity_files.includes(e.file))).map(e => e.entity))];

            what_items.forEach(e => {
                d3.selectAll('.entity-box-what.entity-box-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + e.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
            });
        }

        // Highlight the connected WHERE rectangles
        where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && entity_files.includes(e.file))).map(e => e.entity))];

        where_items.forEach(w => {
            d3.selectAll('.entity-box-where.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            // Highlight the connected WHO rectangles
            let where_who_entity_files = entities.filter(e => {
                return (e.entity === w && e.entity_type === 'GPE');
            }).map(e => e.file);

            who_items = [...new Set(entities.filter(e => (e.entity_type === 'PERSON' && where_who_entity_files.includes(e.file))).map(e => e.entity))];
            who_items.forEach(p => {
                d3.selectAll('.entity-box-who.entity-box-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
            });
        });
    } else if (entity_type === 'what') {
        // Highlight the connected WHEN rectangles
        when_items = [...new Set(entities.filter(e => (e.entity_type === 'DATE' && entity_files.includes(e.file))).map(e => e.entity))];

        when_items.forEach(d => {
            d3.selectAll('.entity-box-when.entity-box-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1)
                .style('stroke-width', '1px')
                .style('stroke', 'black');

            // Highlight the connections
            d3.selectAll('.entity-connection-from-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);
            d3.selectAll('.entity-connection-to-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .style('opacity', 1);

            // Highlight the connected WHERE rectangles
            let when_where_entity_files = entities.filter(e => {
                return (e.entity === d && e.entity_type === 'DATE');
            }).map(e => e.file);
            where_items = [...new Set(entities.filter(e => (e.entity_type === 'GPE' && when_where_entity_files.includes(e.file))).map(e => e.entity))];

            where_items.forEach(w => {
                d3.selectAll('.entity-box-where.entity-box-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1)
                    .style('stroke-width', '1px')
                    .style('stroke', 'black');

                // Highlight the connections
                d3.selectAll('.entity-connection-from-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);
                d3.selectAll('.entity-connection-to-' + w.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                    .style('opacity', 1);

                // Highlight the connected WHO rectangles
                let where_who_entity_files = entities.filter(e => {
                    return (e.entity === w && e.entity_type === 'GPE');
                }).map(e => e.file);

                who_items = [...new Set(entities.filter(e => (e.entity_type === 'PERSON' && where_who_entity_files.includes(e.file))).map(e => e.entity))];
                who_items.forEach(p => {
                    d3.selectAll('.entity-box-who.entity-box-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1)
                        .style('stroke-width', '1px')
                        .style('stroke', 'black');

                    // Highlight the connections
                    d3.selectAll('.entity-connection-from-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                    d3.selectAll('.entity-connection-to-' + p.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                        .style('opacity', 1);
                });
            });

        });
    }
}

/**
 * Handle the mouse out event on a rectangle.
 * @param d
 * @param i
 */
function handleMouseOutRect(d, i) {
    // Reset the rectangles
    // d3.selectAll('.entity-box')
    //     .style('opacity', 0.7)
    //     .attr('stroke', 'none')
    //     .style('stroke-width', '0px');
}

/**
 * Handle the mouse click event on a bubble.
 * @param d
 * @param i
 */
function handleMouseClickRect(d, i) {
    d3.select('#entity-texts').html('');
    let entity_files = d3.select(d.target).attr('data-files').split(',');
    entity_files.forEach(f => {
        let render_htmls = renders.filter(r => r.file === f);
        render_htmls.forEach(r => {
            d3.select('#entity-texts').append('div').append('h4').html('Source: ' + r.file.split('.')[0].toUpperCase());
            d3.select('#entity-texts').append('div').html(r.render);
            d3.select('#entity-texts').append('hr');
        });
    });

    document.getElementById('entity-texts').scrollIntoView({behavior: "smooth"});
}

/**
 * Clear the visualization.
 */
function clean_slate() {
    d3.select('#entity-visualization').html('');
    d3.select('#entity-texts').html('');
}

/**
 * Redraw the visualization.
 */
function redraw_visualization() {
    clean_slate();
    attributes.height_svg = (show_what ? (d3.max([en_persons.length, en_where.length, en_when.length, en_what.length]) * 20 + 40) : (d3.max([en_persons.length, en_where.length, en_when.length]) * 20) + 40);
    draw_activity_visualization()
}
