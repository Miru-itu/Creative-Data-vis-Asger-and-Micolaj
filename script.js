// global const
const width = 1400,
	height = 900;
const margin = { left: 50, right: 50, top: 100, bottom: 100 };

const colors = {
	background: "#212529",
	generated: "#808080",     // gray
	incinerated: "#d7191c",   // red
	recycled: "#1a9850"       // green
};

const barHeight = 60; // ← You can change this for bar thickness
const barSpacing = 0; // space between bars

// setup canvas
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

function draw() {
	canvas.selectAll("*").remove(); // clear before redraw

	const countries = d3.groups(data, d => d.country); // [["Germany", [...]], ["Italy", [...]]]
	const maxGenerated = d3.max(data, d => d.generated);

	const widthScale = d3.scaleLinear()
		.domain([0, maxGenerated])
		.range([50, 400]);

	const pileY = height - margin.bottom;
	let totalUnprocessed = 0;

	countries.forEach(([country, entries], countryIndex) => {
		entries.sort((a, b) => a.year - b.year);

		const baseX = 300 + countryIndex * 450; // new X starting point
		const yScale = d3.scaleLinear()
			.domain([0, entries.length])
			.range([margin.top, margin.top + entries.length * (barHeight + barSpacing)]);

		// Country label
		canvas.append("text")
			.attr("x", baseX + 100)
			.attr("y", margin.top - 40)
			.text(country)
			.attr("fill", "white")
			.attr("font-size", "24px")
			.attr("text-anchor", "middle");

		entries.forEach((d, i) => {
			const y = yScale(i);
			const totalW = widthScale(d.generated);
			const incW = (d.incinerated / d.generated) * totalW;
			const recW = d.recycled ? (d.recycled / d.generated) * totalW : 0;
			const grayW = totalW - incW - recW;
			const barX = baseX + 100 - totalW / 2;

			// RED
			canvas.append("rect")
				.attr("x", barX)
				.attr("y", y)
				.attr("width", incW)
				.attr("height", barHeight)
				.attr("fill", colors.incinerated)
				.attr("stroke", "black");

			// GRAY
			canvas.append("rect")
				.attr("x", barX + incW)
				.attr("y", y)
				.attr("width", grayW)
				.attr("height", barHeight)
				.attr("fill", colors.generated)
				.attr("stroke", "black");

			// GREEN
			if (recW > 0) {
				canvas.append("rect")
					.attr("x", barX + totalW - recW)
					.attr("y", y)
					.attr("width", recW)
					.attr("height", barHeight)
					.attr("fill", colors.recycled)
					.attr("stroke", "black");
			}

			// Label (generated)
			canvas.append("text")
				.attr("x", baseX + 100)
				.attr("y", y + barHeight / 2 + 5)
				.text(`${d.generated.toLocaleString()} tonnes`)
				.attr("fill", "white")
				.attr("font-size", "12px")
				.attr("text-anchor", "middle");

			// Year labels (left only once)
			if (countryIndex === 0) {
				canvas.append("text")
					.attr("x", margin.left)
					.attr("y", y + barHeight / 2 + 5)
					.text(d.year)
					.attr("fill", "white")
					.attr("font-size", "14px")
					.attr("text-anchor", "start");
			}

			// If last year, draw pipe to pile
			if (i === entries.length - 1) {
				const fromX = barX + incW + grayW -50;
				const fromY = y + barHeight;
				const pileX = width / 2;

				// curved path
				const path = d3.path();
				path.moveTo(fromX, fromY);
				path.bezierCurveTo(fromX, fromY + 80, pileX, pileY - 100, pileX, pileY);

				canvas.append("path")
					.attr("d", path.toString())
					.attr("stroke", colors.generated)
					.attr("fill", "none")
					.attr("stroke-width", 2)
					.attr("opacity", 0.4);

				// Accumulate unprocessed
				totalUnprocessed += d.generated - d.incinerated - (d.recycled || 0);
			}
		});
	});

	// Final shared waste pile
	const pileX = width / 2;
	const pileW = totalUnprocessed / 500000;

	canvas.append("path")
		.attr("d", d3.line()([
			[pileX - pileW / 2, pileY],
			[pileX, pileY - 60],
			[pileX + pileW / 2, pileY]
		]))
		.attr("fill", colors.generated)
		.attr("stroke", "#555");

	canvas.append("text")
		.attr("x", pileX)
		.attr("y", pileY + 25)
		.text("Total unprocessed waste")
		.attr("fill", "white")
		.attr("font-size", "14px")
		.attr("text-anchor", "middle");
}

