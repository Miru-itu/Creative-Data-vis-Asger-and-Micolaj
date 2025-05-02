// global const
const width = 1400,
	height = 600;
const margin = { left: 50, right: 50, top: 100, bottom: 100 };
const fogPath =
	"M 0 0 C 1 -1 1 0 2 0 C 3 0 4 0 4 1 C 4 2 5 2 4 3 C 3 4 3 5 2 4 C 1 3 0 4 0 3 C 0 2 -0.6667 2.3333 -1 2 C -2 1 -1 1 0 0";
const space = 40;
const radius = { min: 17, max: 40 };
const colors = {
	background: "#212529",
	rain: "#2c7bb6",
	hail: "#abd9e9",
	storm: "#fdae61",
	fog: "#d7191c",
};

// SVG for the description - containing one element of each of the datapoints
const description = d3
	.select("#data-description")
	.append("svg")
	.attr("width", 100)
	.attr("height", 590)
	.style("background-color", colors.background);

// setup canvas with the main SVG
const canvas = d3
	.select("#canvas")
	.append("svg")
	.attr("width", width)
	.attr("height", height)
	.style("background-color", colors.background);

// load the data
var data = [];
d3.json("data.json").then(function (d) {
	data = d;
	draw();
});

// the main code
function draw() {
	// helper values for creating different scales
	const minPP = Math.min(...data.map((e) => e.PP));
	const maxPP = Math.max(...data.map((e) => e.PP));

	const minTemp = Math.min(...data.map((e) => e.Temp));
	const maxTemp = Math.max(...data.map((e) => e.Temp));

	const minFog = Math.min(...data.map((e) => e.foggyDays));
	const maxFog = Math.max(...data.map((e) => e.foggyDays));

	const getRandomAngle = () => Math.random() * 360;

	// setup scales for the dataviz
	// arrange circles on the x-axis, based on the dataset
	const xScale = d3
		.scaleLinear()
		.domain([0, 9])
		.range([margin.left + space * 1.5, width - margin.right - space]);

	const yScale = d3
		.scaleLinear()
		.domain([1970, 2000])
		.range([margin.bottom, height - margin.bottom]);

	const yScaleYAxis = d3
		.scaleLinear()
		.domain([0, 3])
		.range([margin.bottom, height - margin.bottom]);

	const rainScale = d3
		.scaleLinear()
		.domain([minPP, maxPP])
		.range([radius.min, radius.max]);

	const yScaleDescription = d3
		.scaleLinear()
		.domain([0, 6])
		.range([margin.top, height - margin.bottom]);

	// have to flip min/max temperature, to get blue = cold and red = hot
	const tempScale = d3
		.scaleSequential()
		.domain([maxTemp, minTemp])
		.interpolator(d3.interpolateRdYlBu); // d3 schemeColors

	const fogSizeScale = d3
		.scaleSequential()
		.domain([minFog, maxFog])
		.range([7, 15]);

	// setup a gradient color to use for the temperature line in the description
	const defs = description.append("defs");

	const tempGradient = defs
		.append("linearGradient")
		.attr("id", "line-gradient");

	// blue
	tempGradient
		.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", "#313695");

	// yellow
	tempGradient
		.append("stop")
		.attr("offset", "50%")
		.attr("stop-color", "#FCF4B4");

	// red
	tempGradient
		.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", "#A50026");

	function drawRain() {
		canvas
			.selectAll("rain")
			.data(data)
			.join("circle")
			.attr("cx", function (d) {
				return xScale(d.Year);
			})
			.attr("cy", function (d) {
				return yScale(d.Century);
			})
			.attr("r", function (d) {
				return rainScale(d.PP);
			})
			.attr("fill", colors.rain)
			.attr("class", function (d) {
				return d.Year + d.Century;
			});
	}

	function drawSnow() {
		data.forEach((element) => {
			const padding = rainScale(element.PP);
			const buff = 15;
			// use a for-loop, to draw one dot for every snow day of each element the dataset
			for (let j = 0; j < element.snowDays; j++) {
				// find the bounding-box for where to draw the snow dots within (size of the rain shape)
				const xMin = xScale(element.Year) - padding - buff;
				const xMax = xScale(element.Year) + padding + buff;
				const yMin = yScale(element.Century) - padding - buff;
				const yMax = yScale(element.Century) + padding + buff;

				// position is random, relative to the bounding box
				canvas
					.append("circle")
					.attr("cx", randomPosition(xMin, xMax))
					.attr("cy", randomPosition(yMin, yMax))
					.attr("r", 0.75)
					.attr("fill", "white");
			}
		});
	}

	function drawStorm() {
		data.forEach((element) => {
			// use a for-loop, to draw one circle for every storm day of each element the dataset
			for (let j = 0; j < element.stormDays; j++) {
				canvas
					.append("circle")
					.attr("cx", xScale(element.Year))
					.attr("cy", yScale(element.Century))
					.attr("r", function () {
						r = rainScale(element.PP);
						return r + j * 4 + 4; // increase radius of circle for each storm day added
					})
					.attr("fill", "none")
					.attr("stroke", colors.storm);
			}
		});
	}

	function drawHail() {
		data.forEach((element) => {
			// use a for-loop, to draw one line for every hail day of each element the dataset
			for (let j = 0; j < element.hailDays; j++) {
				canvas
					.append("line")
					.attr("x1", function () {
						// lines are drawn from the center, and then to the left/right of the previous line, to create an effect of "centered lines"
						// use modulo to calculate the position of the line
						if (j % 2 == 0) {
							return xScale(element.Year) + j * 2 + 1;
						} else {
							return xScale(element.Year) - j * 2 - 1;
						}
					})
					.attr("y1", function () {
						const padding = rainScale(element.PP);
						return yScale(element.Century) - padding;
					})
					.attr("x2", function () {
						if (j % 2 == 0) {
							return xScale(element.Year) + j * 2 + 1;
						} else {
							return xScale(element.Year) - j * 2 - 1;
						}
					})
					.attr("y2", function () {
						const padding = rainScale(element.PP);
						return yScale(element.Century) + padding;
					})
					.attr("stroke", colors.hail)
					.attr("stroke-linecap", "round");
			}
		});
	}

	function drawTemperature() {
		canvas
			.selectAll("temperature")
			.data(data)
			.join("line")
			.attr("x1", function (d) {
				const padding = rainScale(d.PP) + 4 + d.stormDays * 4;
				return xScale(d.Year) - padding;
			})
			.attr("y1", function (d) {
				const padding = rainScale(d.PP) + 20 + d.stormDays * 4;
				return yScale(d.Century) + padding;
			})
			.attr("x2", function (d) {
				const padding = rainScale(d.PP) + 4 + d.stormDays * 4;
				return xScale(d.Year) + padding;
			})
			.attr("y2", function (d) {
				const padding = rainScale(d.PP) + 20 + d.stormDays * 4;
				return yScale(d.Century) + padding;
			})
			.attr("stroke", function (d) {
				return tempScale(d.Temp);
			})
			.attr("stroke-width", 3)
			.attr("stroke-linecap", "round")
			.attr("class", function (d) {
				return d.Year + d.Century + "-" + d.Temp;
			});
	}

	function drawFog() {
		canvas
			.selectAll("fog")
			.data(data)
			.join("path")
			.attr("d", fogPath)
			.attr("fill", "#f686bd")
			.attr("opacity", 0.6)
			.attr("transform", function (d, i) {
				const x = xScale(d.Year);
				const y = yScale(d.Century);
				console.log(x, y);
				return `translate(${x}, ${y}) scale(${fogSizeScale(d.foggyDays)}) rotate(${getRandomAngle()})`;
			});
	}

	// draws one shape for every datapoint, to be used in the how-to-read data section
	function drawDescriptionShapes() {
		const pad = 20;

		// PP
		description
			.append("circle")
			.attr("cx", margin.left + pad)
			.attr("cy", yScaleDescription(0))
			.attr("r", 20)
			.attr("fill", colors.rain);

		// Temperature
		description
			.append("rect")
			.attr("x", margin.left - 6)
			.attr("y", yScaleDescription(1))
			.attr("width", 50)
			.attr("height", 5)
			.attr("rx", 3)
			.attr("fill", "url(#line-gradient)")
			.attr("stroke-width", 10);

		// Storm - 2 circles
		for (let i = 0; i < 2; i++) {
			description
				.append("circle")
				.attr("cx", margin.left + pad)
				.attr("cy", yScaleDescription(2) + pad)
				.attr("r", 20 + i * 4)
				.attr("fill", "none")
				.attr("stroke", colors.storm);
		}

		// Hail - 4 lines
		for (let i = 0; i < 4; i++) {
			description
				.append("line")
				.attr("x1", margin.left + pad / 2 + i * 6)
				.attr("y1", yScaleDescription(3) + pad)
				.attr("x2", margin.left + pad / 2 + i * 6)
				.attr("y2", yScaleDescription(3) + pad * 3.2)
				.attr("stroke-linecap", "round")
				.attr("stroke", colors.hail);
		}

		// Snow - 15 dots
		for (let i = 0; i < 15; i++) {
			const buff = 15;
			const xMin = margin.left;
			const xMax = margin.left * 2;
			const yMin = yScaleDescription(4) + pad * 1.5;
			const yMax = yScaleDescription(5) + pad;
			description
				.append("circle")
				.attr("cx", randomPosition(xMin, xMax))
				.attr("cy", randomPosition(yMin, yMax))
				.attr("r", 0.75)
				.attr("fill", "white")
				.attr("stroke", "none");
		}

		// Fog
		description
			.append("path")
			.attr("d", fogPath)
			.attr("fill", "#f686bd")
			.attr("stroke", "none")
			.attr("opacity", 0.6)
			.attr(
				"transform",
				`translate(${margin.left + 10}, 
                ${yScaleDescription(6)}) 
                scale(${9}) rotate(${20})`
			);
	}

	function drawAxes() {
		// setup the x- and y-axis
		const xAxis = d3.axisTop(xScale).tickFormat((d) => `19x${d}`);

		const yTickLabels = ["70s", "80s", "90s", "00s"];
		const yAxis = d3
			.axisLeft(yScaleYAxis)
			.tickValues([0, 1, 2, 3])
			.tickFormat((_, i) => yTickLabels[i]);

		// append axis to the canvas
		canvas
			.append("g")
			.attr("transform", `translate(0, 20)`)
			.attr("opacity", 0.3)
			.call(xAxis);

		canvas
			.append("g")
			.attr("transform", `translate(30, 0)`)
			.attr("opacity", 0.3)
			.call(yAxis);
	}

	// call functions to draw the data viz
	drawDescriptionShapes();
	drawRain();
	drawStorm();
	drawTemperature();
	drawHail();
	drawSnow();
	drawFog();
	drawAxes();
}

// helper function
const randomPosition = (min, max) => Math.random() * (max - min) + min;
