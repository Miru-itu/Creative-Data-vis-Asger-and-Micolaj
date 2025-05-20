import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { sankey, sankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12/+esm";

//alle voriabler
const Variabler = {
    //højde og bredde for sankey
    width: 2500,
    height: 2000,

    // Spacing rundt om sankey
    margin: { 
        top: 100,
        right: 300,
        bottom: 100,
        left: 300
    },
    
    // Variabler for Nodes
    nodes: {
        width: 35,         
        spacing: 30,      
        padding: 63,       
        minHeight: 20       
    },
    
    // Typography for header og text
    fonts: {
        heading: "Oswald",    
        text: "Noto Sans"     
    },
    
    // Font størrelse
    fontSize: {
        labels: 26,           
        title: 36,          
        subtitle: 22         
    },
    
    // Farve tema
    colors: {
        generated: "#7570b3",     // Lilla
        incinerated: "#d95f02",   // Orange 
        recycled: "#1b9e77",      // Grøn
        countries: "#7570b3",     // Lilla igen
        text: "#ffffff",          // Hvid
        stroke: "#000000"         // Sort
    },
    
    // transparency på stregerne
    opacity: {
        links: 0.7,   
        nodes: 1  //bruges som sådan ikke fordi den er 1   
    },
    
    //årstal, defaulter på tallet under
    selectedYear: 2016,
    linkStrokeWidth: 1,    // Gør linjerne tykkere

    // Timeline variabler
    timeline: {
        height: 50,
        yOffset: 200,
        circleRadius: 12,
        lineHeight: 2,
        margin: 100,
        years: [2004, 2006, 2008, 2010, 2012, 2014, 2016]
    },
    
    // Header og annotation Variabler
    header: {
        text: "Hazardous waste in Europe",
        yOffset: 100,
        fontSize: 36
    },
    annotation: {
        x: -15,         
        y: -430,          
        fontSize: 28      
    }
};


// Load json data, og kald createSankeyDiagram
d3.json("data.json").then(function(rawData) {
    createSankeyDiagram(rawData, Variabler.selectedYear);
}).catch(error => {
    console.error("Error loading or processing data:", error);
});

//funktionen der skaber sankey diagrammet
function createSankeyDiagram(data, year) {
    // Filter data år
    const yearData = data.filter(d => d.year === year);
    
    // Opstil countries
    const countries = [...new Set(yearData.map(d => d.country))].filter(Boolean);
    
    // højde og bredde for sankey
    const height = Math.max(Variabler.height, countries.length * Variabler.nodes.spacing);
    const width = Variabler.width;

    // Clear sankey
    d3.select("#canvas").selectAll("svg").remove();

    // Opdater svg
    const svg = d3.select("#canvas")
        .append("svg")
        .attr("width", width * 1.25)  
        .attr("height", (height + Variabler.timeline.yOffset + Variabler.timeline.height) * 1.25)
        .attr("viewBox", [0, 0, width, height + Variabler.timeline.yOffset + Variabler.timeline.height])
        .attr("style", "max-width: 100%; height: auto;");

    // Timeline over sankey
    const timelineG = svg.append("g")
        .attr("class", "timeline")
        .attr("transform", `translate(0, ${Variabler.margin.top})`); 

    //  scale for timelinen
    const timelineScale = d3.scaleLinear()
        .domain([Math.min(...Variabler.timeline.years), Math.max(...Variabler.timeline.years)])
        .range([Variabler.margin.left + 100, width - Variabler.margin.right - 100]);

    // Linjer immellem cirklerne for timelinen
    for (let i = 0; i < Variabler.timeline.years.length - 1; i++) {
        const x1 = timelineScale(Variabler.timeline.years[i]);
        const x2 = timelineScale(Variabler.timeline.years[i + 1]);
        const circleRadius = Variabler.timeline.circleRadius;
        
        timelineG.append("line")
            .attr("x1", x1 + circleRadius) 
            .attr("x2", x2 - circleRadius)  
            .attr("y1", Variabler.timeline.height / 2)
            .attr("y2", Variabler.timeline.height / 2)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", Variabler.timeline.lineHeight);
    }

    // Cirkler i timelinen
    const circles = timelineG.selectAll("circle")
        .data(Variabler.timeline.years)
        .join("circle")
        .attr("cx", d => timelineScale(d))
        .attr("cy", Variabler.timeline.height / 2)
        .attr("r", Variabler.timeline.circleRadius)
        .attr("fill", d => d === year ? "#ffffff" : "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .style("pointer-events", "all"); 

    // Event listeners for cirklerne
    circles.on("mouseover.timeline", function(event, d) {
        if (d !== year) {
            d3.select(this)
                .transition()
                .duration(150) 
                .attr("fill", "rgba(255, 255, 255, 0.5)")
                .attr("r", Variabler.timeline.circleRadius * 1.1); 
        }
    });

    //Fjern mus effekt
    circles.on("mouseout.timeline", function(event, d) {
        if (d !== year) {
            d3.select(this)
                .transition()
                .duration(150)
                .attr("fill", "none")
                .attr("r", Variabler.timeline.circleRadius); 
        }
    });

    circles.on("click.timeline", (event, d) => {
        if (d !== year) {
            event.stopPropagation(); 
            createSankeyDiagram(data, d);
        }
    });

    // Årstal labels for timelinen
    timelineG.selectAll("text")
        .data(Variabler.timeline.years)
        .join("text")
        .attr("x", d => timelineScale(d))
        .attr("y", Variabler.timeline.height / 2 - Variabler.timeline.circleRadius * 2) 
        .attr("text-anchor", "middle")
        .attr("fill", Variabler.colors.text)
        .attr("font-size", "22px") 
        .attr("font-weight", "bold") 
        .attr("font-family", Variabler.fonts.heading)
        .text(d => d);

    // Sankey nodes oprettelse
    const sankeyData = {
        nodes: [
            ...countries.map(country => ({ name: country })),
            ...countries.map(country => ({ name: country + "_generated" })),
            { name: "Environmental Load" },
            { name: "Incinerated" },
            { name: "Recycled" }
        ],
        links: []
    };

    // Opret selve linjerne mellem noderne
    yearData.forEach(d => {
        const countryIndex = sankeyData.nodes.findIndex(n => n.name === d.country);
        const generatedIndex = countries.length + countries.findIndex(c => c === d.country);
        const targetStartIndex = countries.length * 2;
        
        if (countryIndex !== -1) {
            // Link fra country til generated
            sankeyData.links.push(
                { source: countryIndex, target: generatedIndex, value: d.generated }
            );
            
            // Links fra generated til end nodes
            sankeyData.links.push(
                { 
                    source: generatedIndex, 
                    target: targetStartIndex, 
                    value: d.generated - d.incinerated - (d.recycled || 0) 
                },
                { source: generatedIndex, target: targetStartIndex + 1, value: d.incinerated }
            );

            // tilføj link til recycled hvis det ikke er 0
            if (d.recycled > 0) {
                sankeyData.links.push(
                    { source: generatedIndex, target: targetStartIndex + 2, value: d.recycled }
                );
            }
        }
    });

    // sankeyGenerator så den kan tegne det ordentligt
    const sankeyGenerator = sankey()
        .nodeWidth(Variabler.nodes.width)
        .nodePadding(Variabler.nodes.padding)
        .extent([
            [
                Variabler.margin.left, 
                Variabler.margin.top + Variabler.timeline.height + Variabler.header.yOffset + Variabler.header.fontSize + Variabler.timeline.margin
            ], 
            [
                width - Variabler.margin.right, 
                height - Variabler.margin.bottom
            ]
        ])
        .nodeSort((a, b) => {
            // end nodes til højre
            if (["Incinerated", "Recycled", "Environmental Load"].includes(a.name) ||
                ["Incinerated", "Recycled", "Environmental Load"].includes(b.name)) {
                return 0;
            }
            
            // fjerne _generated fra navnet
            const nameA = a.name.replace("_generated", "");
            const nameB = b.name.replace("_generated", "");
            
            // alfabetisk sortering
            return d3.ascending(nameA, nameB);
        });

    const sankeyLayout = sankeyGenerator(sankeyData);

    // tegn linjerne og animation på det
    svg.append("g")
        .selectAll("path")
        .data(sankeyLayout.links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", d => {
            if (!d.source.name.includes("_generated")) return Variabler.colors.generated;
            if (d.target.name === "Incinerated") return Variabler.colors.incinerated;
            if (d.target.name === "Recycled") return Variabler.colors.recycled;
            if (d.target.name === "Environmental Load") return Variabler.colors.generated;
            return Variabler.colors.generated;
        })
        .attr("stroke-width", d => Math.max(Variabler.linkStrokeWidth, d.width))
        .style("stroke-dasharray", function() {
            return this.getTotalLength() + " " + this.getTotalLength();
        })
        .style("animation", (d, i) => {
            // Første fase
            if (!d.source.name.includes("_generated")) {
                return `flowFirstPhase 1.2s ease-out forwards`; 
            }
            // Anden fase
            return `flowSecondPhase 1.5s ease-in-out ${1500 + i * 100}ms forwards`; 
        })
        .attr("opacity", 0);

    // tegn noderne og animation på det
    svg.append("g")
        .selectAll("rect")
        .data(sankeyLayout.nodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(Variabler.nodes.minHeight, d.y1 - d.y0))  
        .attr("y", d => {
            const actualHeight = d.y1 - d.y0;
            if (actualHeight < Variabler.nodes.minHeight) {
                return d.y0 - (Variabler.nodes.minHeight - actualHeight) / 2;
            }
            return d.y0;
        })
        .attr("fill", d => {
            if (d.name === "Environmental Load") return Variabler.colors.generated; 
            if (d.name === "Incinerated") return Variabler.colors.incinerated;
            if (d.name === "Recycled") return Variabler.colors.recycled;
            if (d.name.includes("_generated")) return Variabler.colors.generated;
            return Variabler.colors.countries; 
        })
        .attr("stroke", Variabler.colors.stroke)
        .style("animation", (d, i) => `fadeIn 0.8s ease-out ${i * 100}ms forwards`)
        .attr("opacity", 0);

    // Labels til højre for end nodes
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
            if (["Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
                return (d.y1 + d.y0) / 2 - 10; 
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
                const totalValue = (d.value / 1e6).toFixed(1); 
                return `${d.name}\n(${totalValue}M tonnes)`; 
            }
            
            return d.name;
        })
        // gør det til 2 linjer
        .each(function(d) {
            if (["Incinerated", "Recycled", "Environmental Load"].includes(d.name)) {
                const el = d3.select(this);
                const words = el.text().split('\n');
                el.text(''); 
                
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
        .attr("fill", Variabler.colors.text)
        .attr("font-size", `${Variabler.fontSize.labels}px`)
        .attr("font-weight", "bold")
        .attr("font-family", d => {
            return ["Incinerated", "Recycled", "Environmental Load"].includes(d.name) 
                ? Variabler.fonts.heading 
                : Variabler.fonts.text;
        })
        .style("animation", (d, i) => `fadeIn 0.8s ease-out ${i * 100}ms forwards`)
        .attr("opacity", 0);

    // informations box, kaldes tooltip i d3
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    // scale for de tallene og formattering til K og M
    const numberScale = d3.scaleThreshold()
        .domain([1e3, 1e6])  
        .range([
            d => `${d.toFixed(1)} tonnes`,
            d => `${(d/1e3).toFixed(1)}K tonnes`,
            d => `${(d/1e6).toFixed(1)}M tonnes`
        ]);

    // Ændrer formatNumber til at bruge numberScale:
    const formatNumber = num => numberScale(num)(num);

    // Scale for procent
    const percentageScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, 100]);

    // Function der beregner procenterne
    const calculatePercentages = (data) => {
        const generated = data.generated || data.value;
        return {
            incinerated: percentageScale(data.incinerated / generated).toFixed(1),
            recycled: percentageScale((data.recycled || 0) / generated).toFixed(1)
        };
    };

    // Details for tooltip (information box)
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
            const countryName = d.name.replace("_generated", "");
            const data = yearData.find(item => item.country === countryName);
            
            if (!data) return ""; 
            
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

    // Updater tooltip med information (information box)
    const updateTooltip = (element, event, d) => {
        let borderColor;
        
        if (d.source) {
            // For linjer og ændrer stroke/border farven
            if (!d.source.name.includes("_generated")) {
                borderColor = Variabler.colors.generated; 
            } else if (d.target.name === "Environmental Load") {
                borderColor = Variabler.colors.generated; 
            } else if (d.target.name === "Incinerated") {
                borderColor = Variabler.colors.incinerated; 
            } else if (d.target.name === "Recycled") {
                borderColor = Variabler.colors.recycled; 
            }
        } else {
            // For nodes og ændrer stroke/border farven
            if (d.name.includes("_generated") || d.name === "Environmental Load") {
                borderColor = Variabler.colors.generated; 
            } else if (d.name === "Incinerated") {
                borderColor = Variabler.colors.incinerated;
            } else if (d.name === "Recycled") {
                borderColor = Variabler.colors.recycled;
            } else {
                borderColor = Variabler.colors.generated; 
            }
        }

        tooltip.style("display", "block")
            .style("border-color", borderColor)
            .html(getDetailedInfo(d))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
    };

    // Header tekst
    const header = svg.append("g")
        .attr("class", "header");  

    header.append("text")
        .attr("x", Variabler.width / 2)  
        .attr("y", Variabler.margin.top + Variabler.timeline.height + Variabler.header.yOffset)  
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle") 
        .attr("fill", Variabler.colors.text)
        .attr("font-size", `${Variabler.header.fontSize}px`)
        .attr("font-weight", "bold")
        .attr("font-family", Variabler.fonts.heading)
        .text(`${Variabler.header.text} ${year}`)
        .style("animation", "fadeIn 0.8s ease-out forwards")
        .attr("opacity", 0);

    // Annotation tekst for 2004, 2006, 2008
    if ([2004, 2006, 2008].includes(year)) {
        const annotationX = width - Variabler.margin.right + Variabler.annotation.x;  
        const annotationY = height - Variabler.margin.bottom + Variabler.annotation.y;  
        
        const annotation = svg.append("g")
            .attr("class", "annotation")
            .attr("transform", `translate(${annotationX}, ${annotationY})`);
        
        // annotation text med line breaks
        annotation.append("text")
            .attr("text-anchor", "middle")
            .attr("fill", Variabler.colors.text)
            .attr("font-family", Variabler.fonts.heading) 
            .attr("font-size", `${Variabler.annotation.fontSize}px`)
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

    // Hover effects fpr nodes
    svg.selectAll("rect")
        .on("mouseover", (event, d) => updateTooltip("node", event, d))
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));

    svg.selectAll("path")
        .on("mouseover", function(event, d) {
            // Highlight linjerne
            d3.select(this)
                .style("opacity", 1)
                .style("stroke-opacity", 1);
            
            // hent det rigtige lands data
            const countryName = d.source.name.replace("_generated", "");
            const data = yearData.find(item => item.country === countryName);
            
            // border stroke farve
            let borderColor = Variabler.colors.generated; 
            if (d.source.name.includes("_generated")) {
                if (d.target.name === "Incinerated") {
                    borderColor = Variabler.colors.incinerated;
                } else if (d.target.name === "Recycled") {
                    borderColor = Variabler.colors.recycled;
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
            // fjern highlight fra linjerne
            d3.select(this)
                .style("opacity", Variabler.opacity.links)
                .style("stroke-opacity", Variabler.opacity.links);
            
            tooltip.style("display", "none");
        });

    // Legend for sankey diagrammet
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - Variabler.margin.right - 250}, ${height - Variabler.margin.bottom - 150})`);

    // Hvid rektangel rundt om legend
    legend.append("rect")
        .attr("width", 370)  
        .attr("height", 145)
        .attr("fill", "none")
        .attr("stroke", Variabler.colors.text)
        .attr("stroke-width", 2)
        .attr("rx", 5);

    // Legends selve teksten
    const legendItems = [
        { color: Variabler.colors.generated, text: "Generated/Environmental Load" },
        { color: Variabler.colors.incinerated, text: "Incinerated" },
        { color: Variabler.colors.recycled, text: "Recycled" }
    ];

    const legendItem = legend.selectAll(".legend-item")
        .data(legendItems)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(25, ${35 + i * 30})`); 

    // Legend farver
    legendItem.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

    // tilføj tekst til legend
    legendItem.append("text")
        .attr("x", 35) 
        .attr("y", 10)
        .attr("fill", Variabler.colors.text)
        .attr("font-family", Variabler.fonts.heading)
        .attr("font-size", `${Variabler.fontSize.labels}px`)
        .attr("dominant-baseline", "middle")
        .text(d => d.text);
}
