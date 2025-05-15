import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { sankey, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";

// Visualization settings - easily adjustable
const SETTINGS = {
    // Dimensions
    width: 2500,
    height: 2000,
    
    // Margins
    margin: { 
        top: 100,
        right: 300,
        bottom: 100,
        left: 400  // Increased to accommodate country labels
    },
    
    // Node settings
    nodeWidth: 35,
    countrySpacing: 30,
    nodePadding: 63,     // Added for easy adjustment
    nodeMinHeight: 20,  // Add minimum node height setting
    
    // Text settings
    fontSize: {
        labels: 22,
        title: 24,
        subtitle: 18
    },
    
    // Colors
    colors: {
        generated: "#7570b3",
        incinerated: "#d95f02",
        recycled: "#1b9e77",
        countries: "#7570b3",
        text: "#ffffff",
        stroke: "#000000"
    },
    
    // Opacity settings
    opacity: {
        links: 0.7,
        nodes: 1
    },
    
    // Data settings
    selectedYear: 2016,
    
    // Link settings
    linkStrokeWidth: 1    // Minimum stroke width for links
};

// Function to create Sankey diagram for a specific year
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

    // Update SVG dimensions
    const svg = d3.select("#canvas")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");

    // Create nodes dynamically
    const sankeyData = {
        nodes: [
            // Source nodes (countries)
            ...countries.map(country => ({ name: country })),
            // Target nodes (waste types)
            { name: "Generated" },
            { name: "Incinerated" },
            { name: "Recycled" }
        ],
        links: []
    };

    // Create links for each country
    yearData.forEach(d => {
        const countryIndex = sankeyData.nodes.findIndex(n => n.name === d.country);
        const targetStartIndex = countries.length; // Index where target nodes start
        
        if (countryIndex !== -1) {
            // Always add Generated and Incinerated links
            sankeyData.links.push(
                { source: countryIndex, target: targetStartIndex, value: d.generated },
                { source: countryIndex, target: targetStartIndex + 1, value: d.incinerated }
            );
            
            // Only add recycled link if value is greater than 0
            if (d.recycled > 0) {
                sankeyData.links.push(
                    { source: countryIndex, target: targetStartIndex + 2, value: d.recycled }
                );
            }
        }
    });

    // Modify the Sankey layout for better spacing
    const sankeyGenerator = sankey()
        .nodeWidth(SETTINGS.nodeWidth)
        .nodePadding(SETTINGS.nodePadding)
        .extent([[SETTINGS.margin.left, SETTINGS.margin.top], [width - SETTINGS.margin.right, height - SETTINGS.margin.bottom]])
        .nodeSort((a, b) => {
            // Keep waste types on the right
            const isWasteType = name => ["Generated", "Incinerated", "Recycled"].includes(name);
            if (isWasteType(a.name) && !isWasteType(b.name)) return 1;
            if (!isWasteType(a.name) && isWasteType(b.name)) return -1;
            return d3.ascending(a.name, b.name);
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
            if (d.target.name === "Generated") return SETTINGS.colors.generated;
            if (d.target.name === "Incinerated") return SETTINGS.colors.incinerated;
            if (d.target.name === "Recycled") return SETTINGS.colors.recycled;
            return "#000";
        })
        .attr("stroke-width", d => Math.max(SETTINGS.linkStrokeWidth, d.width))
        .style("stroke-dasharray", function() {
            return this.getTotalLength() + " " + this.getTotalLength();  // Match path length
        })
        .style("animation", (d, i) => `flowAnimation 3s ease-in-out ${i * 100}ms forwards`)  // Increased duration and delay
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
            if (d.name === "Generated") return SETTINGS.colors.generated;
            if (d.name === "Incinerated") return SETTINGS.colors.incinerated;
            if (d.name === "Recycled") return SETTINGS.colors.recycled;
            return SETTINGS.colors.countries;
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
            // Only for country nodes (not waste types)
            if (!["Generated", "Incinerated", "Recycled"].includes(d.name)) {
                return d.x0 - 10; // Position text 10 pixels to the left of node
            }
            return d.x1 + 10; // Keep waste type labels on the right
        })
        .attr("y", d => (d.y1 + d.y0) / 2) // Vertical center of node
        .attr("dy", "0.35em")
        .attr("text-anchor", d => {
            // Right-align country names, left-align waste type names
            return !["Generated", "Incinerated", "Recycled"].includes(d.name) ? "end" : "start";
        })
        .text(d => {
            const value = d.value || 0;
            const formatted = value >= 1e6 
                ? `${(value/1e6).toFixed(1)}M` 
                : value >= 1e3 
                    ? `${(value/1e3).toFixed(1)}K` 
                    : value;
            return `${d.name} (${formatted})`;
        })
        .attr("fill", SETTINGS.colors.text)
        .attr("font-size", `${SETTINGS.fontSize.labels}px`)
        .attr("font-weight", "bold")
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

    // Function to get detailed information
    const getDetailedInfo = d => {
        if (["Generated", "Incinerated", "Recycled"].includes(d.name)) {
            // For waste type nodes
            const sources = sankeyLayout.links
                .filter(link => link.target === d)
                .sort((a, b) => b.value - a.value)
                .map(link => `${link.source.name}: ${formatNumber(link.value)}`)
                .join('<br>');
            
            return `<strong>${d.name}</strong><br>
                    Total: ${formatNumber(d.value)}<br>
                    <br>Sources (ordered by amount):<br>${sources}`;
        } else {
            // For country nodes or links
            const data = d.source ? yearData.find(item => item.country === d.source.name) : 
                                  yearData.find(item => item.country === d.name);
            
            const percentages = calculatePercentages(data);
            
            return `<strong>${d.source ? d.source.name : d.name}</strong><br>
                    Generated: ${formatNumber(data.generated)}<br>
                    Incinerated: ${formatNumber(data.incinerated)} (${percentages.incinerated}% of generated)<br>
                    Recycled: ${formatNumber(data.recycled)} (${percentages.recycled}% of generated)`;
        }
    };

    // Update tooltip function to include color
    const updateTooltip = (element, event, d) => {
        let borderColor;
        if (["Generated", "Incinerated", "Recycled"].includes(d.name)) {
            // For waste type nodes
            borderColor = SETTINGS.colors[d.name.toLowerCase()];
        } else if (d.source) {
            // For links
            borderColor = d.target.name === "Generated" ? SETTINGS.colors.generated :
                         d.target.name === "Incinerated" ? SETTINGS.colors.incinerated :
                         SETTINGS.colors.recycled;
        } else {
            // For country nodes
            borderColor = SETTINGS.colors.countries;
        }

        tooltip.style("display", "block")
            .style("border-color", borderColor)
            .html(getDetailedInfo(d))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    };

    // Apply hover effects to nodes
    svg.selectAll("rect")
        .on("mouseover", (event, d) => updateTooltip("node", event, d))
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    // Apply hover effects to links
    svg.selectAll("path")
        .on("mouseover", (event, d) => updateTooltip("link", event, d))
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));
}

// Load and process the data
d3.json("data.json").then(function(rawData) {
    // Initial render with 2004 data
    createSankeyDiagram(rawData, SETTINGS.selectedYear);
}).catch(error => {
    console.error("Error loading or processing data:", error);
});