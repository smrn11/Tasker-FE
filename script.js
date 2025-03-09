function fetchTasks(userId) {
    fetch(`http://localhost:8080/tasker/list/${userId}`)
        .then(response => response.json())
        .then(tasks => {
            console.log("Fetched tasks:", tasks);
            renderTasksAsBubbles(tasks);
        })
        .catch(error => {
            console.error("Error fetching tasks:", error);
        });
}

function renderTasksAsBubbles(tasks) {
    const svg = d3.select("svg");
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;

    const priorityScale = { HIGH: 50, MEDIUM: 35, LOW: 20 };

    tasks.forEach(task => {
        task.dueDate = new Date(task.dueDate);
    });

    const earliestDate = d3.min(tasks, task => task.dueDate);
    const latestDate = d3.max(tasks, task => task.dueDate);

    const xScale = d3.scaleTime()
        .domain([d3.timeDay.offset(earliestDate, -1), d3.timeDay.offset(latestDate, 1)])
        .range([50, width - 50]);

    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%b %d"))
        .tickSize(10);

    svg.selectAll("*").remove();

    svg.append("g")
        .attr("transform", `translate(0, ${height - 50})`)
        .call(xAxis)
        .selectAll("text")
        .style("font-size", "14px");

    const bubbles = svg.selectAll("circle")
        .data(tasks)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return xScale(d.dueDate);
        })
        .attr("cy", height / 2)
        .attr("r", function(d) {
            return priorityScale[d.priority] || 30;
        })
        .attr("fill", function(d) {
            if (d.priority === "HIGH") return "red";
            if (d.priority === "LOW") return "green";
            return "yellow";
        })
        .attr("opacity", 0.7);

    bubbles.append("title")
        .text(function(d) {
            return `${d.title} - Due: ${d.dueDate.toLocaleDateString()}`;
        });

    svg.selectAll("text.task-title")
        .data(tasks)
        .enter()
        .append("text")
        .attr("x", function(d) { return xScale(d.dueDate); })
        .attr("y", function(d) {
            const radius = priorityScale[d.priority] || 30;
            return height / 2 + radius + 15;
        })
        .attr("text-anchor", "middle")
        .text(function(d) { return d.title; })
        .style("font-size", "12px")
        .style("fill", "black");
}

document.getElementById('user-select').addEventListener('change', function(event) {
    const userId = event.target.value;
    fetchTasks(userId);
});

fetchTasks(1);
