import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { sankey, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";

// Make dimensions dynamic based on number of countries
const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const baseWidth = 1200;
const baseHeight = 800;

// Load and process the data
d3.json("data.json").then(function(rawData) {
    // Process data for the most recent year (2016)
    const data2016 = rawData.filter(d => d.year === 2016);
    
    // Get unique countries
    const countries = [...new Set(data2016.map(d => d.country))];
    
    // Adjust height based on number of countries
    const height = Math.max(baseHeight, countries.length * 100);
    const width = baseWidth;

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
    data2016.forEach(d => {
        const countryIndex = sankeyData.nodes.findIndex(n => n.name === d.country);
        const targetStartIndex = countries.length; // Index where target nodes start
        
        sankeyData.links.push(
            { source: countryIndex, target: targetStartIndex, value: d.generated },
            { source: countryIndex, target: targetStartIndex + 1, value: d.incinerated },
            { source: countryIndex, target: targetStartIndex + 2, value: d.recycled }
        );
    });

    // Modify the Sankey layout for better spacing
    const sankeyGenerator = sankey()
        .nodeWidth(15)
        .nodePadding(Math.max(8, Math.min(20, 200 / countries.length))) // Adjust padding based on number of countries
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .nodeSort((a, b) => {
            // Keep waste types on the right
            const isWasteType = name => ["Generated", "Incinerated", "Recycled"].includes(name);
            if (isWasteType(a.name) && !isWasteType(b.name)) return 1;
            if (!isWasteType(a.name) && isWasteType(b.name)) return -1;
            return d3.ascending(a.name, b.name);
        });

    const sankeyLayout = sankeyGenerator(sankeyData);

    // Draw the links
    svg.append("g")
        .selectAll("path")
        .data(sankeyLayout.links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => {
            if (d.target.name === "Generated") return "#808080";
            if (d.target.name === "Incinerated") return "#ff0000";
            if (d.target.name === "Recycled") return "#008000";
            return "#000";
        })
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("opacity", 0.7);

    // Draw the nodes
    svg.append("g")
        .selectAll("rect")
        .data(sankeyLayout.nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => {
            if (d.name === "Generated") return "#808080";
            if (d.name === "Incinerated") return "#ff0000";
            if (d.name === "Recycled") return "#008000";
            return "#4CAF50";
        })
        .attr("stroke", "#000");

    // Modify labels for better readability
    svg.append("g")
        .selectAll("text")
        .data(sankeyLayout.nodes)
        .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => {
            // Format large numbers with K/M suffix
            const value = d.value || 0; // Add fallback for undefined values
            const formatted = value >= 1e6 
                ? `${(value/1e6).toFixed(1)}M` 
                : value >= 1e3 
                    ? `${(value/1e3).toFixed(1)}K` 
                    : value;
            return `${d.name} (${formatted})`;
        })
        .attr("fill", "#fff")
        .attr("font-size", "12px")
        .attr("font-weight", "bold");
});