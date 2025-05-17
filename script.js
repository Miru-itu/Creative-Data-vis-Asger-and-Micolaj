import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { sankey, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";

/** 
 * Configuration object for the Sankey diagram visualization
 * Controls all visual and behavioral aspects of the diagram
 */
const SETTINGS = {
    // Core dimensions of the visualization
    width: 2500,
    height: 2000,
    
    // Spacing around the diagram
    margin: { 
        top: 100,
        right: 300,
        bottom: 100,
        left: 300
    },
    
    // Node appearance and spacing
    nodeWidth: 35,        // Width of each node in the diagram
    countrySpacing: 30,   // Vertical space between country nodes
    nodePadding: 63,      // Vertical padding between node connections
    nodeMinHeight: 20,    // Minimum height for small nodes to ensure visibility
    
    // Typography configuration
    fonts: {
        heading: "Oswald",    // Used for titles and key labels
        text: "Noto Sans"     // Used for general text and country names
    },
    fontSize: {
        labels: 26,           // Size for node labels
        title: 36,           // Size for main title
        subtitle: 22         // Size for secondary text
    },
    
    // Color scheme
    colors: {
        generated: "#7570b3",     // Purple - Used for country nodes and generated waste
        incinerated: "#d95f02",   // Orange - Used for incinerated waste
        recycled: "#1b9e77",      // Green - Used for recycled waste
        countries: "#7570b3",     // Purple - Matches generated for consistency
        text: "#ffffff",          // White - All text elements
        stroke: "#000000"         // Black - Node borders
    },
    
    // Flow and node transparency
    opacity: {
        links: 0.7,   // Transparency of connection flows
        nodes: 1      // Nodes are fully opaque
    },
    
    // Default year and flow settings
    selectedYear: 2016,
    linkStrokeWidth: 1,    // Base width of connection flows

    // Timeline configuration
    timeline: {
        height: 50,
        yOffset: 200,
        circleRadius: 12,
        lineHeight: 2,
        margin: 100,
        years: [2004, 2006, 2008, 2010, 2012, 2014, 2016]
    },
    
    // Header and annotation settings
    header: {
        text: "Hazardous waste in Europe",
        yOffset: 100,
        fontSize: 36
    },
    annotation: {
        x: -15,           // Horizontal position offset
        y: -430,          // Vertical position offset
        fontSize: 28      // Size of annotation text
    }
};

/**
 * Creates a Sankey diagram visualizing hazardous waste flow for a specific year
 * @param {Array} data - The complete dataset for all years
 * @param {number} year - The specific year to visualize
 */
function createSankeyDiagram(data, year) {
    // Filter data for the selected year
    const yearData = data.filter(d => d.year === year);
    
    // Get unique countries
    const countries = [...new Set(yearData.map(d => d.country))].filter(Boolean);
    
    // Adjust height based on number of countries
    const height = Math.max(SETTINGS.height, countries.length * SETTINGS.countrySpacing);
    const width = SETTINGS.width;

    // Clear previous diagram if exists
    d3.select("#canvas").selectAll("svg").remove();

    // Update SVG dimensions to accommodate timeline
    const svg = d3.select("#canvas")
        .append("svg")
        .attr("width", width * 1.25)  // Increase the container size by 1.25 (inverse of 0.8)
        .attr("height", (height + SETTINGS.timeline.yOffset + SETTINGS.timeline.height) * 1.25)
        .attr("viewBox", [0, 0, width, height + SETTINGS.timeline.yOffset + SETTINGS.timeline.height])
        .attr("style", "max-width: 100%; height: auto;");

    // Create timeline group (move it above Sankey)
    const timelineG = svg.append("g")
        .attr("class", "timeline")
        .attr("transform", `translate(0, ${SETTINGS.margin.top})`); // Move to top margin

    // Create scale for timeline
    const timelineScale = d3.scaleLinear()
        .domain([Math.min(...SETTINGS.timeline.years), Math.max(...SETTINGS.timeline.years)])
        .range([SETTINGS.margin.left + 100, width - SETTINGS.margin.right - 100]);

    // Draw lines between years (but not through circles)
    for (let i = 0; i < SETTINGS.timeline.years.length - 1; i++) {
        const x1 = timelineScale(SETTINGS.timeline.years[i]);
        const x2 = timelineScale(SETTINGS.timeline.years[i + 1]);
        const circleRadius = SETTINGS.timeline.circleRadius;
        
        timelineG.append("line")
            .attr("x1", x1 + circleRadius)  // Start after first circle
            .attr("x2", x2 - circleRadius)  // End before second circle
            .attr("y1", SETTINGS.timeline.height / 2)
            .attr("y2", SETTINGS.timeline.height / 2)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", SETTINGS.timeline.lineHeight);
    }

    // Add circles for years with improved hover and click effects
    const circles = timelineG.selectAll("circle")
        .data(SETTINGS.timeline.years)
        .join("circle")
        .attr("cx", d => timelineScale(d))
        .attr("cy", SETTINGS.timeline.height / 2)
        .attr("r", SETTINGS.timeline.circleRadius)
        .attr("fill", d => d === year ? "#ffffff" : "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .style("pointer-events", "all"); // Ensure circles capture all mouse events

    // Add event listeners separately for better control
    circles.on("mouseover.timeline", function(event, d) {
        if (d !== year) {
            d3.select(this)
                .transition()
                .duration(150) // Slightly faster transition
                .attr("fill", "rgba(255, 255, 255, 0.5)")
                .attr("r", SETTINGS.timeline.circleRadius * 1.1); // Slightly increase size on hover
        }
    });

    circles.on("mouseout.timeline", function(event, d) {
        if (d !== year) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("fill", "none")
                .attr("r", SETTINGS.timeline.circleRadius); // Return to original size
        }
    });

    circles.on("click.timeline", (event, d) => {
        if (d !== year) {
            event.stopPropagation(); // Prevent event bubbling
            createSankeyDiagram(data, d);
        }
    });

    // Add year labels
    timelineG.selectAll("text")
        .data(SETTINGS.timeline.years)
        .join("text")
        .attr("x", d => timelineScale(d))
        .attr("y", SETTINGS.timeline.height / 2 - SETTINGS.timeline.circleRadius * 2) // Move above circles
        .attr("text-anchor", "middle")
        .attr("fill", SETTINGS.colors.text)
        .attr("font-size", "22px") // Increased font size
        .attr("font-weight", "bold") // Make text bold
        .attr("font-family", SETTINGS.fonts.heading)
        .text(d => d);

    // Create nodes dynamically
    const sankeyData = {
        nodes: [
            // Source nodes (countries)
            ...countries.map(country => ({ name: country })),
            // Intermediate nodes (one per country)
            ...countries.map(country => ({ name: country + "_generated" })),
            // Target nodes (waste types) - Environmental Load first
            { name: "Environmental Load" },
            { name: "Incinerated" },
            { name: "Recycled" }
        ],
        links: []
    };

    // Create links for each country
    yearData.forEach(d => {
        const countryIndex = sankeyData.nodes.findIndex(n => n.name === d.country);
        const generatedIndex = countries.length + countries.findIndex(c => c === d.country);
        const targetStartIndex = countries.length * 2;
        
        if (countryIndex !== -1) {
            // Link from country to its generated node
            sankeyData.links.push(
                { source: countryIndex, target: generatedIndex, value: d.generated }
            );
            
            // Links from generated to waste types - Environmental Load first
            sankeyData.links.push(
                { 
                    source: generatedIndex, 
                    target: targetStartIndex, 
                    value: d.generated - d.incinerated - (d.recycled || 0) // Account for missing recycled data
                },
                { source: generatedIndex, target: targetStartIndex + 1, value: d.incinerated }
            );

            // Only add recycling link if the value is not 0
            if (d.recycled && d.recycled > 0) {
                sankeyData.links.push(
                    { source: generatedIndex, target: targetStartIndex + 2, value: d.recycled }
                );
            }
        }
    });

    // Update the sankeyGenerator configuration
    const sankeyGenerator = sankey()
        .nodeWidth(SETTINGS.nodeWidth)
        .nodePadding(SETTINGS.nodePadding)
        .extent([
            [
                SETTINGS.margin.left, 
                SETTINGS.margin.top + SETTINGS.timeline.height + SETTINGS.header.yOffset + SETTINGS.header.fontSize + SETTINGS.timeline.margin
            ], 
            [
                width - SETTINGS.margin.right, 
                height - SETTINGS.margin.bottom
            ]
        ])
        .nodeSort((a, b) => {
            // Sort end nodes to the right
            if (["Incinerated", "Recycled", "Environmental Load"].includes(a.name) ||
                ["Incinerated", "Recycled", "Environmental Load"].includes(b.name)) {
                return 0;
            }
            
            // Remove _generated suffix for comparison
            const nameA = a.name.replace("_generated", "");
            const nameB = b.name.replace("_generated", "");
            
            // Keep alphabetical order for countries and their generated nodes
            return d3.ascending(nameA, nameB);
        });

    const sankeyLayout = sankeyGenerator(sankeyData);

    // Draw the links with animation
    svg.append("g")
        .selectAll("path")
        .data(sankeyLayout.links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => {
            if (!d.source.name.includes("_generated")) return SETTINGS.colors.generated;
            if (d.target.name === "Incinerated") return SETTINGS.colors.incinerated;
            if (d.target.name === "Recycled") return SETTINGS.colors.recycled;
            if (d.target.name === "Environmental Load") return SETTINGS.colors.generated;
            return SETTINGS.colors.generated;
        })
        .attr("stroke-width", d => Math.max(SETTINGS.linkStrokeWidth, d.width))
        .style("stroke-dasharray", function() {
            return this.getTotalLength() + " " + this.getTotalLength();
        })
        .style("animation", (d, i) => {
            // First phase: all country to generated links animate together
            if (!d.source.name.includes("_generated")) {
                return `flowFirstPhase 1.2s ease-out forwards`; // Try 1.2s instead of 0.8s
            }
            // Second phase: staggered animation for links to end nodes
            return `flowSecondPhase 1.5s ease-in-out ${1500 + i * 100}ms forwards`; // Increased delay to 1500ms
        })
        .attr("opacity", 0);

    // Draw the nodes with animation
    svg.append("g")
        .selectAll("rect")
        .data(sankeyLayout.nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(SETTINGS.nodeMinHeight, d.y1 - d.y0))  // Set minimum height
        .attr("y", d => {
            // Center the node if it's smaller than minimum height
            const actualHeight = d.y1 - d.y0;
            if (actualHeight < SETTINGS.nodeMinHeight) {
                return d.y0 - (SETTINGS.nodeMinHeight - actualHeight) / 2;
            }
            return d.y0;
        })
        .attr("fill", d => {
            if (d.name === "Environmental Load") return SETTINGS.colors.generated; // Changed to purple
            if (d.name === "Incinerated") return SETTINGS.colors.incinerated;
            if (d.name === "Recycled") return SETTINGS.colors.recycled;
            if (d.name.includes("_generated")) return SETTINGS.colors.generated;
            return SETTINGS.colors.countries; // Purple for country nodes
        })
        .attr("stroke", SETTINGS.colors.stroke)
        .style("animation", (d, i) => `fadeIn 0.8s ease-out ${i * 100}ms forwards`)
        .attr("opacity", 0);

    // Add labels for countries and waste types
    svg.append("g")
        .selectAll("text")
        .data(sankeyLayout.nodes)
        .join("text")
        .attr("x", d => {
            if (!["Generated", "Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
                return d.x0 - 10;
            }
            return d.x1 + 10;
        })
        .attr("y", d => {
            // Adjust y position for end nodes to accommodate two lines
            if (["Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
                return (d.y1 + d.y0) / 2 - 10; // Move up slightly to center both lines
            }
            return (d.y1 + d.y0) / 2;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", d => {
            return !["Generated", "Incinerated", "Recycled", "Environmental Load"].includes(d.name) ? "end" : "start";
        })
        .text(d => {
            if (d.name.includes("_generated")) return "";
            
            if (["Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
                const totalValue = (d.value / 1e6).toFixed(1); // Convert to millions
                return `${d.name}\n(${totalValue}M tonnes)`; // Add line break
            }
            
            return d.name;
        })
        // Split text into two lines for end nodes
        .each(function(d) {
            if (["Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
                const el = d3.select(this);
                const words = el.text().split('\n');
                el.text(''); // Clear existing text
                
                el.append("tspan")
                    .attr("x", d.x1 + 10)
                    .attr("dy", "0em")
                    .text(words[0]);
                    
                el.append("tspan")
                    .attr("x", d.x1 + 10)
                    .attr("dy", "1.2em")
                    .text(words[1]);
            }
        })
        .attr("fill", SETTINGS.colors.text)
        .attr("font-size", `${SETTINGS.fontSize.labels}px`)
        .attr("font-weight", "bold")
        .attr("font-family", d => {
            // Use heading font for end nodes, text font for countries
            return ["Incinerated", "Recycled", "Environmental Load"].includes(d.name) 
                ? SETTINGS.fonts.heading 
                : SETTINGS.fonts.text;
        })
        .style("animation", (d, i) => `fadeIn 0.8s ease-out ${i * 100}ms forwards`)
        .attr("opacity", 0);

    // Add tooltip div if it doesn't exist
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    // Helper function to format numbers and add tonnes
    const formatNumber = num => {
        if (num >= 1e6) return `${(num/1e6).toFixed(1)}M tonnes`;
        if (num >= 1e3) return `${(num/1e3).toFixed(1)}K tonnes`;
        return `${num} tonnes`;
    };

    // Function to calculate percentages
    const calculatePercentages = (data) => {
        const generated = data.generated || data.value;
        const incinerated = data.incinerated || (data.target?.name === "Incinerated" ? data.value : 0);
        const recycled = data.recycled || (data.target?.name === "Recycled" ? data.value : 0);
        
        return {
            incinerated: ((incinerated / generated) * 100).toFixed(1),
            recycled: ((recycled / generated) * 100).toFixed(1)
        };
    };

    // Update the getDetailedInfo function
    const getDetailedInfo = d => {
        if (["Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
            // For end nodes (right side)
            const sources = sankeyLayout.links
                .filter(link => link.target === d)
                .sort((a, b) => b.value - a.value)
                .map(link => {
                    const country = link.source.name.replace("_generated", "");
                    return `${country}: ${formatNumber(link.value)}`;
                })
                .join('<br>');
            
            return `<strong>${d.name}</strong><br>
                    Total: ${formatNumber(d.value)}<br>
                    <br>Sources (ordered by amount):<br>${sources}`;
        } else {
            // For country nodes (left side) and generated nodes (middle)
            const countryName = d.name.replace("_generated", "");
            const data = yearData.find(item => item.country === countryName);
            
            if (!data) return ""; // Guard clause for missing data
            
            const environmentalLoad = data.generated - data.incinerated - (data.recycled || 0);
            const envLoadPercent = ((environmentalLoad / data.generated) * 100).toFixed(1);
            const incineratedPercent = ((data.incinerated / data.generated) * 100).toFixed(1);
            const recycledPercent = (((data.recycled || 0) / data.generated) * 100).toFixed(1);
            
            return `<strong>${countryName}</strong><br>
                    Generated: ${formatNumber(data.generated)}<br>
                    Environmental Load: ${formatNumber(environmentalLoad)} (${envLoadPercent}%)<br>
                    Incinerated: ${formatNumber(data.incinerated)} (${incineratedPercent}%)<br>
                    ${data.recycled ? `Recycled: ${formatNumber(data.recycled)} (${recycledPercent}%)<br>` : ''}`;
        }
    };

    // Update the updateTooltip function
    const updateTooltip = (element, event, d) => {
        let borderColor;
        
        if (d.source) {
            // For links
            if (!d.source.name.includes("_generated")) {
                borderColor = SETTINGS.colors.generated; // Purple for country to generated
            } else if (d.target.name === "Environmental Load") {
                borderColor = SETTINGS.colors.generated; // Purple for environmental load
            } else if (d.target.name === "Incinerated") {
                borderColor = SETTINGS.colors.incinerated; // Orange for incinerated
            } else if (d.target.name === "Recycled") {
                borderColor = SETTINGS.colors.recycled; // Green for recycled
            }
        } else {
            // For all nodes
            if (d.name.includes("_generated") || d.name === "Environmental Load") {
                borderColor = SETTINGS.colors.generated; // Purple for generated and environmental load
            } else if (d.name === "Incinerated") {
                borderColor = SETTINGS.colors.incinerated;
            } else if (d.name === "Recycled") {
                borderColor = SETTINGS.colors.recycled;
            } else {
                borderColor = SETTINGS.colors.generated; // Purple for country nodes
            }
        }

        tooltip.style("display", "block")
            .style("border-color", borderColor)
            .html(getDetailedInfo(d))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    };

    // Add header text
    const header = svg.append("g")
        .attr("class", "header");  // Remove the transform from here

    header.append("text")
        .attr("x", SETTINGS.width / 2)  // Center based on total width
        .attr("y", SETTINGS.margin.top + SETTINGS.timeline.height + SETTINGS.header.yOffset)  // Move y position here
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")  // Add this for vertical centering
        .attr("fill", SETTINGS.colors.text)
        .attr("font-size", `${SETTINGS.header.fontSize}px`)
        .attr("font-weight", "bold")
        .attr("font-family", SETTINGS.fonts.heading)
        .text(`${SETTINGS.header.text} ${year}`)
        .style("animation", "fadeIn 0.8s ease-out forwards")
        .attr("opacity", 0);

    // Update the annotation positioning code
    if ([2004, 2006, 2008].includes(year)) {
        const annotationX = width - SETTINGS.margin.right + SETTINGS.annotation.x;  // Use x offset
        const annotationY = height - SETTINGS.margin.bottom + SETTINGS.annotation.y;  // Use y offset
        
        const annotation = svg.append("g")
            .attr("class", "annotation")
            .attr("transform", `translate(${annotationX}, ${annotationY})`);
        
        // Add annotation text with line breaks and correct font
        annotation.append("text")
            .attr("text-anchor", "middle")
            .attr("fill", SETTINGS.colors.text)
            .attr("font-family", SETTINGS.fonts.heading)  // Changed to Oswald
            .attr("font-size", `${SETTINGS.annotation.fontSize}px`)
            .selectAll("tspan")
            .data([
                "Before 2010, no recycled hazardous waste",
                "had been reported, as reporting only became",
                "mandatory following changes in EU",
                "regulations that year."
            ])
            .join("tspan")
            .attr("x", 0)
            .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
            .text(d => d)
            .style("animation", "fadeIn 0.8s ease-out forwards")
            .attr("opacity", 0);

     
    }

    // Apply hover effects to nodes
    svg.selectAll("rect")
        .on("mouseover", (event, d) => updateTooltip("node", event, d))
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    // Replace just the path hover events at the bottom of createSankeyDiagram function
    svg.selectAll("path")
        .on("mouseover", function(event, d) {
            // Highlight the hovered link
            d3.select(this)
                .style("opacity", 1)
                .style("stroke-opacity", 1);
            
            // Get the country data and border color based on link type
            const countryName = d.source.name.replace("_generated", "");
            const data = yearData.find(item => item.country === countryName);
            
            // Determine border color based on link target
            let borderColor = SETTINGS.colors.generated; // Default purple
            if (d.source.name.includes("_generated")) {
                if (d.target.name === "Incinerated") {
                    borderColor = SETTINGS.colors.incinerated;
                } else if (d.target.name === "Recycled") {
                    borderColor = SETTINGS.colors.recycled;
                }
            }
            
            if (data) {
                const environmentalLoad = data.generated - data.incinerated - (data.recycled || 0);
                const envLoadPercent = ((environmentalLoad / data.generated) * 100).toFixed(1);
                const incineratedPercent = ((data.incinerated / data.generated) * 100).toFixed(1);
                const recycledPercent = (((data.recycled || 0) / data.generated) * 100).toFixed(1);
                
                tooltip.style("display", "block")
                    .style("border-color", borderColor)
                    .html(`<strong>${countryName}</strong><br>
                           Generated: ${formatNumber(data.generated)}<br>
                           Environmental Load: ${formatNumber(environmentalLoad)} (${envLoadPercent}%)<br>
                           Incinerated: ${formatNumber(data.incinerated)} (${incineratedPercent}%)<br>
                           ${data.recycled ? `Recycled: ${formatNumber(data.recycled)} (${recycledPercent}%)<br>` : ''}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            // Reset the link opacity
            d3.select(this)
                .style("opacity", SETTINGS.opacity.links)
                .style("stroke-opacity", SETTINGS.opacity.links);
            
            tooltip.style("display", "none");
        });

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - SETTINGS.margin.right - 250}, ${height - SETTINGS.margin.bottom - 150})`);

    // Add white rectangle border around legend
    legend.append("rect")
        .attr("width", 370)  // Increased width to fit content
        .attr("height", 145)
        .attr("fill", "none")
        .attr("stroke", SETTINGS.colors.text)
        .attr("stroke-width", 2)
        .attr("rx", 5);

    // Legend items with adjusted positioning
    const legendItems = [
        { color: SETTINGS.colors.generated, text: "Generated/Environmental Load" },
        { color: SETTINGS.colors.incinerated, text: "Incinerated" },
        { color: SETTINGS.colors.recycled, text: "Recycled" }
    ];

    // Add legend items with centered positioning
    const legendItem = legend.selectAll(".legend-item")
        .data(legendItems)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(25, ${35 + i * 30})`);  // Adjusted padding

    // Add colored rectangles
    legendItem.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

    // Add text labels with adjusted positioning
    legendItem.append("text")
        .attr("x", 35)  // More space after colored rectangle
        .attr("y", 10)
        .attr("fill", SETTINGS.colors.text)
        .attr("font-family", SETTINGS.fonts.heading)
        .attr("font-size", `${SETTINGS.fontSize.labels}px`)
        .attr("dominant-baseline", "middle")
        .text(d => d.text);
}

// Load and process the data
d3.json("data.json").then(function(rawData) {
    // Initial render with 2004 data
    createSankeyDiagram(rawData, SETTINGS.selectedYear);
}).catch(error => {
    console.error("Error loading or processing data:", error);
});